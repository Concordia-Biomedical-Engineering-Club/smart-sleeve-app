export interface Exercise {
  id: string;
  name: string;
  focus: string;
  formTip: string;
  targetReps: number;
  workDurationSec: number;
  restDurationSec: number;
  description: string;
  primaryChannels: number[]; // e.g. [0, 1] for Quads
}

export const EXERCISE_LIBRARY: Exercise[] = [
  {
    id: 'quad-sets',
    name: 'Quadriceps Sets',
    focus: 'VMO / VL Balance',
    formTip: 'Keep your toes pointed up and press the back of your knee into the floor.',
    targetReps: 10,
    workDurationSec: 5,
    restDurationSec: 3,
    description: 'Tighten your quad by pressing your knee flat while lying down. Builds VMO and VL balance critical for knee stability.',
    primaryChannels: [0, 1],
  },
  {
    id: 'straight-leg-raises',
    name: 'Straight Leg Raises',
    focus: 'Quad Recruitment',
    formTip: 'Tighten your quad before lifting — do not let the knee bend.',
    targetReps: 10,
    workDurationSec: 5,
    restDurationSec: 3,
    description: 'Lift your straight leg to the height of the opposite bent knee. Strengthens the quads without stressing the joint.',
    primaryChannels: [0, 1],
  },
  {
    id: 'wall-slides',
    name: 'Wall Slides',
    focus: 'Hamstring Co-contraction',
    formTip: 'Keep your back flat against the wall and do not let your knees go past your toes.',
    targetReps: 8,
    workDurationSec: 5,
    restDurationSec: 4,
    description: 'Slide down a wall into a partial squat position. Trains hamstring co-contraction and overall leg control.',
    primaryChannels: [0, 1, 2, 3],
  },
  {
    id: 'heel-slides',
    name: 'Heel Slides',
    focus: 'Range of Motion',
    formTip: 'Slide slowly and stop if you feel sharp pain — gentle tension is normal.',
    targetReps: 10,
    workDurationSec: 5,
    restDurationSec: 3,
    description: 'Lying flat, slowly slide your heel toward your glutes and back. Primary ROM exercise for post-surgical recovery.',
    primaryChannels: [2, 3],
  },
];
