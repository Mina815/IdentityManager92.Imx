import { AbstractControl, FormControl, FormGroup, ValidationErrors, Validators } from '@angular/forms';

export function createCustomAccessRequestForm(): FormGroup {
  return new FormGroup(
    {
      reason: new FormControl('', Validators.required),
      validFrom: new FormControl('', Validators.required),
      validUntil: new FormControl('', Validators.required),
    },
    { validators: validDateRangeValidator }
  );
}

export function validDateRangeValidator(control: AbstractControl): ValidationErrors | null {
  const start = control.get('validFrom')?.value;
  const end = control.get('validUntil')?.value;
  if (!start || !end) {
    return null;
  }

  const startTime = new Date(start).getTime();
  const endTime = new Date(end).getTime();
  if (Number.isNaN(startTime) || Number.isNaN(endTime)) {
    return { invalidDate: true };
  }

  return endTime < startTime ? { invalidDateRange: true } : null;
}
