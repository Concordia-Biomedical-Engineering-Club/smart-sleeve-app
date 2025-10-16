# Contributing to the Smart Rehabilitation Knee Sleeve App

First off, thank you for considering contributing! We are thrilled to have you on the team. This project is a collaborative effort, and we welcome all contributions.

This document provides a set of guidelines for contributing to the project. Following these guidelines helps to ensure a smooth and effective workflow for everyone.

## Code of Conduct

This project and everyone participating in it is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior.

## How Can I Contribute?

All work on this project is tracked via GitHub Issues. If you have an idea, find a bug, or want to work on a new feature, the first step is to check the [Issues tab](https://github.com/Concordia-Biomedical-Engineering-Club/smart-sleeve-app/issues).

- **Reporting Bugs:** If you find a bug, please create a new issue using the "Bug Report" template.
- **Suggesting Enhancements:** If you have an idea for a new feature, create a new issue using the "Feature Request" template.
- **Working on an Issue:** If you want to work on an existing issue, please assign it to yourself or leave a comment so we know it's being handled.

**The Golden Rule:** All work must be linked to an existing issue.

## 🚀 Our Development Workflow

We use the **GitHub Flow** branching model. The `main` branch is our single source of truth and should always be in a deployable state. All new work is done on feature branches.

Here is the step-by-step process for contributing code:

### 1. Assign the Issue
Find an unassigned issue on our [Project Board](https://github.com/Concordia-Biomedical-Engineering-Club/smart-sleeve-app/projects) in the "To Do" column that you would like to work on. Assign it to yourself and move the card to the "In Progress" column.

### 2. Create a Branch
Create a new local branch from the `main` branch. Please use our branch naming convention:

`type/issue-number/short-description`

- **`type`**: What kind of change is this?
    - `feat`: A new feature
    - `fix`: A bug fix
    - `docs`: Changes to documentation
    - `refactor`: Code changes that neither fix a bug nor add a feature
    - `test`: Adding missing tests
    - `style`: Changes that do not affect the meaning of the code (white-space, formatting)
- **`issue-number`**: The number of the issue you are addressing (e.g., `12`).
- **`short-description`**: A few words describing the change (e.g., `add-sensor-integration`).

**Example:**
```sh
git checkout main
git pull origin main
git checkout -b feat/13/add-sensor-integration
```

### 3. Commit Your Changes
Make your changes to the codebase. Write clear, concise commit messages that explain the "why" behind your change.

**Example:**
```sh
git commit -m "feat: Add Bluetooth sensor data collection endpoint"
```

### 4. Open a Pull Request (PR)
When your work is complete, push your branch to the repository and open a Pull Request against the `main` branch.

```sh
git push origin feat/13/add-sensor-integration
```

- **Link the Issue:** In your PR description, use a keyword to automatically link and close the issue upon merging. **This is mandatory.**
    - Example: `Closes #13`
- **Fill out the Template:** Your PR will be pre-filled with a template. Please fill out the checklist to ensure you've followed all the steps.
- **Request a Review:** Request a review from the project lead or a senior team member.

### 5. Code Review
Your PR will be reviewed by at least one other team member. They may leave comments or request changes. Please be responsive to feedback and work with the reviewer to get the PR ready for merging. Once your PR is approved, it will be merged into the `main` branch.

## 📝 Coding Standards & Style Guide

To maintain a consistent and readable codebase, we enforce the following standards:

- **Python (Backend):** We use `black` for code formatting. Before committing, please format your Python code.
- **JavaScript/TypeScript (Mobile/Web):** We use `prettier` for code formatting.
- **Flutter (Mobile):** We use `flutter format` for code formatting.

We plan to automate these checks with GitHub Actions in the future.

## ❓ Questions?
If you have any questions about the contribution process, please feel free to open an issue or reach out to the project lead.