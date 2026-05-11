# Calibration and Normalization Follow-up

## Context

This note captures the MVC calibration and normalization issues identified while reviewing and cleaning the onboarding PR branch.

These findings are intentionally documented as follow-up work and should not be folded into the onboarding branch again. The onboarding branch was cleaned to contain issue #8 only. The calibration concerns belong to the clinical normalization scope introduced by issue #74.

At the time of investigation, mock hardware mode was enabled:

```dotenv
EXPO_PUBLIC_USE_MOCK_HARDWARE=true
```

## Status Update

As of March 12, 2026, the follow-up implementation described in this note has been completed in the local codebase and validated with automated tests.

Implemented fixes:

1. Calibration now captures from a dedicated filtered sample stream rather than reusing dashboard `latestFeatures.rms` snapshots.
2. Mock calibration now explicitly forces `REST` during baseline capture and `FLEX` during MVC capture.
3. Signal warmup is surfaced into app state and blocks calibration start until the processor is ready.
4. Raw-mode UI no longer claims unsupported `μV` units; shared raw/normalized labels are used instead.
5. Raw graph scaling is now dynamic rather than fixed to a mock-only ceiling.
6. Automated tests now cover calibration runtime state, normalization capture semantics, warmup gating, and raw graph display behavior.

Files added or materially updated during this remediation:

- `smart-sleeve-app/components/dashboard/CalibrationOverlay.tsx`
- `smart-sleeve-app/components/dashboard/RMSGraph.tsx`
- `smart-sleeve-app/components/dashboard/signalDisplay.ts`
- `smart-sleeve-app/app/(tabs)/dashboard.tsx`
- `smart-sleeve-app/hooks/useSleeveDevice.ts`
- `smart-sleeve-app/store/deviceSlice.ts`
- `smart-sleeve-app/services/NormalizationService.ts`
- `smart-sleeve-app/__test__/dashboard/CalibrationOverlay.test.tsx`
- `smart-sleeve-app/__test__/dashboard/DashboardComponents.test.tsx`
- `smart-sleeve-app/__test__/services/NormalizationService.test.ts`
- `smart-sleeve-app/__test__/services/SignalProcessor.test.ts`
- `smart-sleeve-app/__test__/store/deviceSlice.test.ts`

Validation status:

- Full Jest suite passed locally: 17 suites, 116 tests.

## Executive Summary

The original investigation was correct: the percent MVC math was acceptable, but the calibration capture path and UI semantics needed remediation. Those follow-up fixes have now been implemented.

The original problem set was:

1. Calibration samples are captured from already-aggregated RMS features instead of a proper calibration capture stream.
2. Mock calibration does not explicitly switch between REST and FLEX during the two calibration phases.
3. Filter warmup exists in the signal processor but is not respected before baseline capture starts.
4. The UI labels current raw values as `μV`, but the present mock pipeline is not producing true microvolt values.
5. Raw graph scaling is hardcoded to a mock-specific range and will not generalize.
6. Test coverage proves formula behavior, but not the real calibration capture path end to end.

## What We Confirmed

### 1. The app is using the mock connector in the current environment

With `EXPO_PUBLIC_USE_MOCK_HARDWARE=true`, the connector factory chooses `MockSleeveConnector`.

Relevant files:

- `smart-sleeve-app/services/SleeveConnector/SleeveConnectionFactory.ts`
- `smart-sleeve-app/.env`

Important detail:

- The factory treats anything other than the literal string `false` as mock mode.

### 2. Calibration does run through the MVC/baseline code path

The calibration overlay does call the normalization service and computes:

- baseline during the rest step
- MVC during the flex step
- coefficients via `buildCoefficients(...)`

Relevant files:

- `smart-sleeve-app/components/dashboard/CalibrationOverlay.tsx`
- `smart-sleeve-app/services/NormalizationService.ts`

### 3. Calibration did not control mock REST/FLEX state explicitly

This is a major issue in mock mode.

The calibration overlay changes its own UI phase from rest to flex, but it does not drive the mock connector scenario. The mock connector only changes behavior when `connector.setScenario(...)` is called. That call currently happens through Redux scenario forwarding in `useSleeveDevice`, not from calibration.

Relevant files:

- `smart-sleeve-app/components/dashboard/CalibrationOverlay.tsx`
- `smart-sleeve-app/hooks/useSleeveDevice.ts`
- `smart-sleeve-app/store/deviceSlice.ts`
- `smart-sleeve-app/services/MockBleService/MockSleeveConnector.ts`

Consequence at the time:

- In normal app flow, calibration is very likely capturing REST-like mock data for both phases unless some other part of the app has already switched the scenario to FLEX.

## Detailed Issues

### Issue 1. Calibration captured `liveRMS`, not a dedicated calibration stream

The overlay calls `addFrame(liveRMS)` while in rest/flex mode.

That `liveRMS` value is not raw EMG. It is already derived from a rolling buffer in the device hook.

Relevant flow:

1. EMG frames arrive through the connector.
2. `useSleeveDevice` pushes channel arrays into a rolling buffer.
3. `FeatureExtractor.extractFeaturesWithNormalization(...)` computes RMS from that rolling buffer.
4. The dashboard exposes `latestFeatures.rms` as `liveRMS`.
5. The calibration overlay samples those RMS values again.

Relevant files:

- `smart-sleeve-app/hooks/useSleeveDevice.ts`
- `smart-sleeve-app/services/SignalProcessing/FeatureExtractor.ts`
- `smart-sleeve-app/components/dashboard/CalibrationOverlay.tsx`

Why this was a problem:

- Calibration should operate on a dedicated signal capture path, not on overlapping already-aggregated feature snapshots.
- This smooths and distorts the baseline and MVC estimates.
- MVC peaks can be suppressed because the app is effectively calibrating from rolling RMS snapshots rather than direct capture epochs.

Resolution status:

- Fixed. Calibration now consumes `latestCalibrationSample`, which is emitted from the filtered stream in `useSleeveDevice` before dashboard feature aggregation.

### Issue 2. Mock calibration did not enforce REST then FLEX

The calibration flow visually has:

- Step 1: Rest
- Step 2: Flex

But mock mode is driven by connector scenario, not by the overlay text. The scenario is only updated by app workout state or the hidden BLE test screen, not by calibration itself.

Relevant files:

- `smart-sleeve-app/components/dashboard/CalibrationOverlay.tsx`
- `smart-sleeve-app/services/MockBleService/MockSleeveConnector.ts`
- `smart-sleeve-app/services/MockBleService/SleeveDataGenerator.ts`
- `smart-sleeve-app/store/deviceSlice.ts`

Why this was a problem:

- In mock mode, the baseline and MVC steps may both use REST behavior.
- That makes the computed MVC coefficients unreliable or flat.
- This directly explains why the calibration experience looks wrong under mock hardware.

Resolution status:

- Fixed. Device state now includes `calibrationScenarioOverride`, and calibration explicitly drives `REST` then `FLEX` with cleanup on confirm, cancel, retry, dismiss, disconnect, and unmount.

### Issue 3. Signal processor warmup was ignored

The signal processor defines a warmup period and exposes `isWarmedUp()`, but that information is not used before calibration begins.

Relevant file:

- `smart-sleeve-app/services/SignalProcessing/SignalProcessor.ts`

Important detail:

- The code comments say the filter needs around 50 frames, roughly 1 second at 50 Hz, to settle.

Why this was a problem:

- If the user starts calibration soon after connecting, the baseline may include filter transient.
- That contaminates the baseline and shifts the normalization range.
- The resulting percent MVC becomes unstable or misleading.

Resolution status:

- Fixed. Warmup state is now surfaced into Redux as `isSignalWarmedUp`, reset on disconnect, and used to block calibration start with explicit UI copy.

### Issue 4. The UI labeled raw values as `μV`, but the app was not producing true microvolt values

The dashboard and calibration confirmation screen present values as microvolts.

Relevant files:

- `smart-sleeve-app/components/dashboard/CalibrationOverlay.tsx`
- `smart-sleeve-app/app/(tabs)/dashboard.tsx`

However, the current mock generator outputs unitless amplitudes such as `0.05`, `0.5`, and `0.8`, and there is no conversion layer from ADC counts or volts to true `μV` anywhere in the current pipeline.

Relevant files:

- `smart-sleeve-app/services/MockBleService/SleeveDataGenerator.ts`
- `smart-sleeve-app/services/SignalProcessing/FeatureExtractor.ts`
- `smart-sleeve-app/services/NormalizationService.ts`

Why this was a problem:

- The numbers may still be internally useful for normalization, but the unit label is misleading.
- The current implementation should be treated as normalized RMS or arbitrary units, not clinical microvolts.

Resolution status:

- Fixed for the current mock/filtered pipeline. Shared display labels now use `Raw RMS` instead of `μV` in raw mode.
- Remaining future work: a true `μV` label should only return if a hardware-backed conversion layer is introduced.

### Issue 5. Raw graph scaling was hardcoded to a mock-specific range

The RMS graph hardcodes `RAW_Y_MAX = 1.0`.

Relevant file:

- `smart-sleeve-app/components/dashboard/RMSGraph.tsx`

Why this was a problem:

- It happens to fit the current mock amplitudes.
- It will clip or misrepresent values once real hardware scaling is introduced.
- Even before real hardware, it makes the graph behavior tightly coupled to the current mock generator assumptions.

Resolution status:

- Fixed. Raw graph scaling now derives its ceiling dynamically from recent values via `getRawGraphMax(...)`.

### Issue 6. Tests did not cover the real calibration capture path

Current tests validate normalization math on synthetic values, which is useful, but not sufficient.

Relevant files:

- `smart-sleeve-app/__test__/SignalProcessing/FeatureExtractor.test.ts`
- `smart-sleeve-app/__test__/services/ProgressAnalysis.test.ts`

Why this was a problem:

- The tests prove that `normalize(...)` works if the coefficients are already good.
- They do not prove that the app captures clinically meaningful baseline and MVC coefficients in real flow.
- There is no end-to-end test for calibration phase handling, mock scenario switching, or warmup gating.

Resolution status:

- Fixed to the intended scope of this follow-up. New tests now cover:
  - direct-sample normalization capture semantics
  - warmup readiness contract
  - calibration scenario override lifecycle
  - raw label consistency
  - dynamic raw graph scaling

- Remaining future work: if a higher-fidelity integration path is added later, hook-level or device-stream integration tests would still be valuable.

## Scope Decision

These issues should be addressed in a dedicated follow-up branch or PR from current `main`.

They should not be added to the onboarding branch because:

1. The onboarding branch was intentionally cleaned to issue #8 only.
2. These problems belong to the normalization/calibration scope.
3. Reintroducing them into onboarding would recreate the stacked-PR contamination problem that was already fixed.

## Recommended Follow-up Work

The follow-up work below was the implementation plan used for the remediation. It is preserved here as record of the approach that was taken.

### Priority 1. Fix mock calibration phase control

During calibration:

- force mock scenario to `REST` during baseline capture
- force mock scenario to `FLEX` during MVC capture
- restore normal scenario behavior after calibration finishes or is cancelled

This should affect mock mode only. Real hardware should remain a no-op for scenario changes.

### Priority 2. Separate calibration capture from dashboard `liveRMS`

Refactor calibration so it samples from a dedicated filtered EMG capture path rather than reusing the dashboard feature stream.

Possible approaches:

- capture filtered EMG frames directly and compute calibration metrics from those frames
- expose a dedicated calibration stream or service that is fed from the processor before dashboard aggregation

### Priority 3. Enforce filter warmup before calibration starts

Use processor warmup state before allowing baseline capture.

Examples:

- block calibration start until the processor is warmed up
- or add a short settling step before baseline collection begins

### Priority 4. Correct the UI language around units

Until a true `μV` conversion exists, relabel raw mode to something accurate, such as:

- `RMS`
- `Signal`
- `Raw RMS`
- `a.u.`

If true microvolts are required, add an actual calibration and scaling layer that converts hardware signal values into clinically meaningful `μV` units.

### Priority 5. Remove mock-specific raw graph assumptions

Replace the hardcoded raw graph max with one of:

- dynamic autoscaling
- calibrated display ranges
- a configuration that distinguishes mock scaling from real hardware scaling

### Priority 6. Add end-to-end calibration tests

Add tests that cover:

- mock REST to FLEX switching during calibration
- warmup gating before baseline capture
- baseline and MVC collection with expected mock behavior
- cleanup and scenario restoration on cancel/retry
- persisted coefficient correctness after confirm

## Implementation Plan

This should be executed as a dedicated follow-up branch from current `main`, not on the onboarding branch.

Recommended branch strategy:

1. `fix/calibration-mock-phase-control`
2. `refactor/calibration-capture-pipeline`
3. `fix/calibration-ui-and-tests`

If preferred, items 1 and 3 can be combined into a single small PR, but item 2 should stay isolated because it changes the capture architecture.

### Phase 0. Lock the current behavior down with characterization tests

Goal:

- capture the current calibration behavior before refactoring so regressions are visible

Files to touch first:

- `smart-sleeve-app/__test__/dashboard/DashboardComponents.test.tsx`
- `smart-sleeve-app/__test__/SignalProcessing/FeatureExtractor.test.ts`
- new calibration-focused tests under `smart-sleeve-app/__test__/services/` or `smart-sleeve-app/__test__/dashboard/`

Tasks:

1. Add a focused test for `NormalizationService` that proves baseline and MVC are currently derived from pushed feature frames.
2. Add a test for mock connector scenario changes so future calibration logic can assert scenario ownership.
3. Add a test for `SignalProcessor.isWarmedUp()` so warmup gating has a stable contract.

Exit criteria:

- current behavior is documented in tests before architectural changes begin

### Phase 1. Introduce calibration-owned mock phase control

Goal:

- ensure mock mode always captures REST during baseline and FLEX during MVC

Primary files:

- `smart-sleeve-app/components/dashboard/CalibrationOverlay.tsx`
- `smart-sleeve-app/store/deviceSlice.ts`
- `smart-sleeve-app/hooks/useSleeveDevice.ts`
- `smart-sleeve-app/services/MockBleService/MockSleeveConnector.ts`

Recommended implementation:

1. Add explicit calibration scenario ownership to Redux instead of overloading workout-driven `scenario` state.
2. Introduce a temporary calibration override such as `calibrationScenarioOverride: 'REST' | 'FLEX' | null` in device state.
3. Update `useSleeveDevice` so connector scenario selection resolves in this order:
   calibration override, then workout scenario, then default REST.
4. On calibration start, set override to `REST`.
5. When baseline capture completes and MVC begins, switch override to `FLEX`.
6. On confirm, cancel, retry, dismiss, disconnect, or unmount, clear the override.

Why this order matters:

- it fixes the most visible mock-mode defect first without forcing the larger capture refactor into the same PR

Exit criteria:

1. In mock mode, baseline and MVC use different signal profiles even if the rest of the app never changes workout state.
2. Scenario override cleanup is deterministic on every exit path.
3. Real-hardware behavior remains unchanged.

### Phase 2. Replace `liveRMS` calibration with a dedicated capture pipeline

Goal:

- stop calibrating from already-aggregated dashboard feature snapshots

Primary files:

- `smart-sleeve-app/hooks/useSleeveDevice.ts`
- `smart-sleeve-app/services/NormalizationService.ts`
- `smart-sleeve-app/services/SignalProcessing/FeatureExtractor.ts`
- `smart-sleeve-app/components/dashboard/CalibrationOverlay.tsx`
- `smart-sleeve-app/store/deviceSlice.ts`

Recommended implementation shape:

1. Define a dedicated calibration input contract, for example filtered per-frame channels or a short calibration sample window.
2. Feed that contract from `useSleeveDevice` immediately after filtering, before dashboard aggregation into the rolling feature buffer.
3. Keep the dashboard feature path unchanged for charting and cards.
4. Refactor `NormalizationService` so it operates on calibration samples rather than dashboard `rms` snapshots.
5. Keep coefficient building logic separate from sample collection logic so the service remains testable.

Preferred design split:

- `SignalProcessor` remains responsible for filtering.
- `FeatureExtractor` remains responsible for dashboard features.
- calibration collection becomes its own small service or reducer-owned buffer, instead of piggybacking on `latestFeatures`.

Important constraint:

- do not store large calibration sample buffers in persisted user state; keep them ephemeral in component state, hook state, or non-persisted device state

Exit criteria:

1. Calibration no longer calls `addFrame(liveRMS)`.
2. Calibration samples come from the filtered stream before rolling RMS aggregation.
3. MVC capture can observe real peaks independently of dashboard smoothing.

### Phase 3. Enforce warmup gating before baseline capture

Goal:

- prevent baseline capture from using transient filter output

Primary files:

- `smart-sleeve-app/services/SignalProcessing/SignalProcessor.ts`
- `smart-sleeve-app/hooks/useSleeveDevice.ts`
- `smart-sleeve-app/store/deviceSlice.ts`
- `smart-sleeve-app/components/dashboard/CalibrationOverlay.tsx`

Recommended implementation:

1. Surface processor warmup state from `useSleeveDevice` into Redux, for example `isSignalWarmedUp`.
2. Reset that state on disconnect and reconnect.
3. Block the calibration start CTA until warmup completes, or insert an explicit settling phase before baseline collection begins.
4. Show the user why calibration cannot start yet.

Preferred UX:

- disable the start button with copy like `Preparing signal...` and automatically enable calibration once warmup is complete

Exit criteria:

1. Baseline capture cannot begin until warmup requirements are satisfied.
2. Disconnecting and reconnecting resets the gate.
3. Tests cover both blocked and ready states.

### Phase 4. Correct unit language and graph scaling

Goal:

- stop presenting arbitrary-unit RMS values as clinical microvolts

Primary files:

- `smart-sleeve-app/components/dashboard/CalibrationOverlay.tsx`
- `smart-sleeve-app/app/(tabs)/dashboard.tsx`
- `smart-sleeve-app/components/dashboard/RMSGraph.tsx`

Recommended implementation:

1. Replace `μV RMS` language with neutral terminology such as `RMS` or `Raw RMS` until a real conversion layer exists.
2. Add a single shared display label helper so the overlay and dashboard cannot drift.
3. Replace `RAW_Y_MAX = 1.0` with one of:
   dynamic autoscaling, bounded rolling peak scaling, or environment-aware display config.
4. Keep normalized mode on a fixed scale, since `% MVC` does have a defined user-facing range.

Preferred scope for this phase:

- wording fixes and graph scaling only
- do not attempt a real microvolt conversion in the same PR unless hardware scaling requirements are already specified

Exit criteria:

1. Raw mode no longer claims `μV`.
2. Raw graph does not assume the mock generator's current amplitude range.
3. Normalized mode display remains stable.

### Phase 5. Add end-to-end calibration coverage

Goal:

- prove the actual calibration flow works, not just the final normalization formula

Primary test areas:

- `smart-sleeve-app/__test__/dashboard/`
- `smart-sleeve-app/__test__/services/`
- possibly new hook-level tests for `useSleeveDevice`

Test cases to add:

1. Starting calibration in mock mode forces REST.
2. Completing baseline switches mock mode to FLEX.
3. Cancel, retry, dismiss, and unmount clear the calibration override.
4. Warmup gate blocks baseline start until enough filtered frames have arrived.
5. Confirm persists coefficients with the expected baseline and MVC values.
6. Raw and normalized display labels render the correct terminology.
7. Raw graph autoscaling or dynamic scaling behaves sensibly for low and high ranges.

Manual validation checklist:

1. Connect in mock mode and verify visibly different traces during REST and FLEX calibration steps.
2. Attempt calibration immediately after connect and confirm warmup prevents premature capture.
3. Retry calibration and verify scenario cleanup is correct.
4. Save coefficients, enable normalized mode, and confirm `% MVC` display still behaves as expected.

Exit criteria:

- the calibration flow is covered at the state, service, and UI levels

## Proposed PR Breakdown

### PR 1. Mock phase control and warmup plumbing

Scope:

- add calibration scenario override state
- route override through `useSleeveDevice`
- expose warmup state
- add tests for override and warmup behavior

Why first:

- smallest functional fix with the highest mock-mode impact

### PR 2. Dedicated calibration capture refactor

Scope:

- remove dependence on `latestFeatures.rms` for calibration
- introduce dedicated calibration sample collection
- adapt normalization service APIs if needed
- add service-level tests for capture semantics

Why isolated:

- highest architectural risk and most likely to need review iteration

### PR 3. UI semantics, graph scaling, and flow validation

Scope:

- remove misleading `μV` labels
- implement raw graph scaling strategy
- add screen-level and end-to-end calibration tests
- update docs if terminology changes affect screenshots or product copy

Why last:

- depends on the underlying calibration flow being stable first

## Risks and Watch-outs

1. Do not let calibration override permanently fight workout-driven scenario changes; calibration ownership must be temporary and explicit.
2. Do not persist transient calibration buffers to Redux persistence.
3. Do not mix unit relabeling with true hardware scaling unless the conversion requirements are defined.
4. Do not refactor the dashboard feature path more than necessary while separating calibration capture.
5. Keep backward compatibility for existing saved coefficients unless the calibration data shape truly has to change.

## Definition of Done

This follow-up is complete when all of the following are true:

1. Mock calibration deterministically runs REST then FLEX.
2. Calibration collects from a dedicated filtered capture path instead of dashboard `liveRMS`.
3. Warmup is enforced before baseline capture.
4. Raw-value UI no longer claims unsupported units.
5. Raw graph scaling is no longer mock-specific.
6. Automated tests cover the calibration flow beyond the normalization formula alone.

Status:

- Completed in the current local codebase and validated by the passing Jest suite.

## Remaining Open Work

The issues originally documented here are covered by the implemented remediation. The main remaining open items are future-facing rather than blockers for the current follow-up:

1. Add a true hardware-to-`μV` conversion layer if clinically meaningful microvolt display is required.
2. Add manual device validation against real hardware once scaling requirements are finalized.
3. Consider hook-level integration tests around `useSleeveDevice` if the streaming pipeline becomes more complex.

## Suggested Acceptance Criteria For The Follow-up

1. In mock mode, calibration always uses REST for baseline and FLEX for MVC.
2. Baseline capture cannot start until filtering has warmed up, or an explicit settling phase is complete.
3. Calibration coefficients are generated from a dedicated capture path, not from dashboard `liveRMS` snapshots.
4. The UI does not claim `μV` unless the data is truly expressed in microvolts.
5. Raw-mode graph scaling is not hardcoded to mock-only assumptions.
6. Automated tests cover the calibration flow end to end.

## Short Version

The current percent MVC feature is not totally broken, but it is not rigorous enough yet.

The biggest defect in mock mode is simple and important:

- the calibration UI says "rest" then "flex"
- the mock generator is not being forced to switch to match those steps

That should be fixed first in the follow-up work.
