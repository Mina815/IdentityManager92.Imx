import { Component, OnDestroy, OnInit } from '@angular/core';
import { AbstractControl, UntypedFormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { EuiLoadingService } from '@elemental-ui/core';
import { CheckMode, PortalShopServiceitems } from 'imx-api-qer';
import { DisplayColumns, IEntityColumn } from 'imx-qbm-dbts';
import { AuthenticationService, SnackBarService } from 'qbm';
import { CartItemsService } from '../shopping-cart/cart-items.service';
import { CartItemInteractiveService } from '../shopping-cart/cart-item-edit/cart-item-interactive.service';
import { ServiceItemsService } from '../service-items/service-items.service';

@Component({
  selector: 'imx-contractor-request',
  templateUrl: './contractor-request.component.html',
  styleUrls: ['./contractor-request.component.scss'],
})
export class ContractorRequestComponent implements OnInit, OnDestroy {
  public readonly requestForm = new UntypedFormGroup({});
  public parameterColumns: IEntityColumn[] = [];
  public requestItem: PortalShopServiceitems;
  public isLoading = true;
  public isSubmitting = false;
  public errorMessage: string;

  private readonly requestName = 'Create Contractor';
  private readonly requestCategory = 'Identity & Access – Onboarding';
  private readonly uidITShopOrg = '5E08600E-C940-47BA-B269-32CAF1D4E086'; // not the AccProduct UID — the shelf/shop entry UID
  private readonly uidAccProduct = 'c26b2d33-b9be-469a-b9d3-97a1a7aa0acc';

  private userUid: string;
  private draftCartItem;
  private draftWrapper;

  // Guards against the draft being created more than once per component
  // lifetime, and against it being left orphaned if the user navigates
  // away without submitting.
  private draftCreationInFlight: Promise<void> | null = null;
  private submitted = false;

  constructor(
    private readonly authentication: AuthenticationService,
    private readonly serviceItems: ServiceItemsService,
    private readonly cartItems: CartItemsService,
    private readonly cartItemInteractive: CartItemInteractiveService,
    private readonly busyService: EuiLoadingService,
    private readonly snackbar: SnackBarService,
    private readonly router: Router,
  ) {}

  public async ngOnInit(): Promise<void> {
    this.userUid = this.authentication.onSessionResponse.value.UserUid;
    await this.loadRequestItem();
  }

  public async ngOnDestroy(): Promise<void> {
    // Covers in-app navigation away from this page without submitting.
    // Does NOT reliably cover a hard browser-tab close — Angular lifecycle
    // hooks aren't guaranteed to fire in that case.
    if (this.draftCartItem && !this.submitted) {
      try {
        await this.cartItems.removeItems([this.draftCartItem]);
      } catch {
        // best-effort cleanup; don't block navigation on this
      }
    }
  }

  public onControlCreated(name: string, control: AbstractControl, column: IEntityColumn): void {
    this.requestForm.addControl(name, control);

    if (!this.isRequiredField(column)) {
      return;
    }

    Promise.resolve().then(() => {
      const validators = control.validator
        ? (Array.isArray(control.validator) ? [...control.validator, Validators.required] : [control.validator, Validators.required])
        : [Validators.required];

      control.setValidators(validators);
      control.updateValueAndValidity();
      this.requestForm.updateValueAndValidity();
    });
  }

  public async submit(): Promise<void> {
    if (!this.requestItem || this.requestForm.invalid || this.isSubmitting) {
      return;
    }

    this.isSubmitting = true;
    const busy = this.busyService.show();
    try {
      if (this.parameterColumns.length > 0) {
        await this.cartItems.save(this.draftWrapper);
      }

      const result = await this.cartItems.submit(this.draftCartItem.UID_ShoppingCartOrder.value, CheckMode.SubmitWithWarnings);
      if (result.HasErrors) {
        throw new Error('The contractor request failed validation.');
      }
      this.snackbar.open({ key: '#LDS#The contractor request has been successfully submitted.' });
      this.submitted = true;
      this.requestForm.reset();
      await this.router.navigate(['requesthistory']);
    } catch (error) {
      this.errorMessage = '#LDS#The contractor request could not be submitted.';
      this.snackbar.open({ key: this.errorMessage });
    } finally {
      if (this.draftCartItem && this.errorMessage) {
        await this.cartItems.removeItems([this.draftCartItem]);
        this.submitted = false; // draft is gone; nothing left for ngOnDestroy to clean up
      }
      this.isSubmitting = false;
      this.busyService.hide(busy);
    }
  }

  private async loadRequestItem(): Promise<void> {
    // Prevents double-creation if ngOnInit somehow fires twice on the same
    // instance (e.g. re-entrant navigation) before the first call resolves.
    if (this.draftCreationInFlight) {
      return this.draftCreationInFlight;
    }

    this.draftCreationInFlight = (async () => {
      try {
        const response = await this.serviceItems.get({
          UID_Person: this.userUid,
          IncludeChildCategories: true,
          search: this.requestName,
          PageSize: 100,
        });
        this.requestItem = response.Data.find(item =>
          item.GetEntity().GetColumn(DisplayColumns.DISPLAY_PROPERTYNAME).GetDisplayValue() === this.requestName &&
          this.normalize(item.ServiceCategoryFullPath?.Column?.GetDisplayValue()) === this.normalize(this.requestCategory)
        );

        if (!this.requestItem) {
          this.errorMessage = '#LDS#The Create Contractor request is not available.';
          return;
        }

        const created = await this.cartItems.createAndPost({
          UidPerson: this.userUid,
          UidITShopOrg: this.uidITShopOrg,
          UidAccProduct: this.uidAccProduct,
          Display: this.requestItem.GetEntity().GetDisplay(),
          DisplayRecipient: this.userUid,
        }, '');
        this.draftCartItem = created.Data[0];
        this.draftWrapper = await this.cartItemInteractive.getExtendedEntity(this.cartItems.getKey(this.draftCartItem));
        this.parameterColumns = (this.draftWrapper.parameterCategoryColumns || []).map(item => item.column);
      } catch (error) {
        this.errorMessage = '#LDS#The Create Contractor request is not available.';
      } finally {
        this.isLoading = false;
      }
    })();

    return this.draftCreationInFlight;
  }

  private isRequiredField(column: IEntityColumn): boolean {
    if (!column) {
      return false;
    }

    const metadata = column.GetMetadata();
    if (metadata && metadata.GetMinLength && metadata.GetMinLength() > 0) {
      return true;
    }

    const normalized = (column.ColumnName || '').replace(/[^a-z0-9]/gi, '').toLowerCase();
    return ['firstname', 'lastname', 'employeetype'].includes(normalized);
  }

  private normalize(value: string): string {
    return (value || '').replace(/\s+/g, ' ').trim();
  }
}