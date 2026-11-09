import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

export interface CustomAccessRequestResult {
  person: string;
  account: string;
  success: boolean;
  error?: string;
}

export interface CustomAccessRequestResultData {
  successful: CustomAccessRequestResult[];
  failed: CustomAccessRequestResult[];
  submitted: boolean;
}

@Component({
  selector: 'imx-custom-access-request-result',
  template: `
    <h2 mat-dialog-title>{{ '#LDS#Application access request results' | translate }}</h2>
    <mat-dialog-content>
      <p *ngIf="data.submitted">{{ '#LDS#The request was submitted for approval.' | translate }}</p>
      <p *ngIf="!data.submitted">{{ '#LDS#The request items were saved in your shopping cart.' | translate }}</p>
      <div class="result-row" *ngFor="let result of data.successful">
        <eui-icon icon="check"></eui-icon>
        <span>{{ result.person }} — {{ result.account }}</span>
      </div>
      <div class="result-row failure" *ngFor="let result of data.failed">
        <eui-icon icon="error"></eui-icon>
        <span>{{ result.person }} — {{ result.account }}: {{ result.error | translate }}</span>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button color="primary" (click)="dialogRef.close()">{{ '#LDS#Close' | translate }}</button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      .result-row {
        align-items: flex-start;
        display: flex;
        gap: 8px;
        margin: 8px 0;
      }
      .failure {
        color: var(--color-red-60, #b10e1e);
      }
    `,
  ],
})
export class CustomAccessRequestResultDialog {
  constructor(
    @Inject(MAT_DIALOG_DATA) public readonly data: CustomAccessRequestResultData,
    public readonly dialogRef: MatDialogRef<CustomAccessRequestResultDialog>
  ) {}
}
