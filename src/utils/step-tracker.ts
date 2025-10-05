import { TestStep } from '../types';

interface StepEntry {
  title: string;
  startTime: number;
  endTime?: number;
  error?: string;
}

/**
 * Tracks test execution steps with timing information
 */
export class StepTracker {
  private steps: StepEntry[] = [];

  /**
   * Log a new step in the test execution
   * Automatically finalizes the previous step's timing
   */
  log(title: string): void {
    // Finalize previous step
    if (this.steps.length > 0) {
      const lastStep = this.steps[this.steps.length - 1];
      if (!lastStep.endTime) {
        lastStep.endTime = Date.now();
      }
    }

    // Add new step
    this.steps.push({
      title,
      startTime: Date.now(),
    });
  }

  /**
   * Mark the current step as failed with an error message
   */
  markCurrentStepFailed(error: string): void {
    if (this.steps.length > 0) {
      const currentStep = this.steps[this.steps.length - 1];
      currentStep.error = error;
      if (!currentStep.endTime) {
        currentStep.endTime = Date.now();
      }
    }
  }

  /**
   * Get all steps in TestStep format
   */
  getSteps(): TestStep[] {
    // Finalize the last step if not done
    if (this.steps.length > 0) {
      const lastStep = this.steps[this.steps.length - 1];
      if (!lastStep.endTime) {
        lastStep.endTime = Date.now();
      }
    }

    return this.steps.map((step) => ({
      title: step.title,
      duration: (step.endTime || Date.now()) - step.startTime,
      error: step.error,
    }));
  }

  /**
   * Clear all tracked steps
   */
  clear(): void {
    this.steps = [];
  }

  /**
   * Get the number of steps tracked
   */
  getStepCount(): number {
    return this.steps.length;
  }
}
