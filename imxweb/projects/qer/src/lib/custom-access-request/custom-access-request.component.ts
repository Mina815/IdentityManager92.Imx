import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { EuiLoadingService } from '@elemental-ui/core';
import { CheckMode, PortalCartitem, PortalPersonReports, PortalShopServiceitems } from 'imx-api-qer';
import { IEntityColumn, MultiValue, ValueStruct } from 'imx-qbm-dbts';
import { AuthenticationService, ClassloggerService, SnackBarService } from 'qbm';
import { CartItemsService } from '../shopping-cart/cart-items.service';
import { ExtendedEntityWrapper } from '../parameter-data/extended-entity-wrapper.interface';
import { ServiceItemsService } from '../service-items/service-items.service';
import { ShelfService } from '../itshop/shelf.service';
import { UserModelService } from '../user/user-model.service';
import { PersonService } from '../person/person.service';
import {
  CustomAccessRequestAccount,
  CustomAccessRequestPerson,
  CustomAccessRequestRequestBuilder,
} from './custom-access-request-request-builder.service';
import { createCustomAccessRequestForm } from './custom-access-request-form';
import { CustomAccessRequestResultDialog, CustomAccessRequestResult } from './custom-access-request-result.dialog';
import { QerApiService } from '../qer-api-client.service';

interface AccessRequestAccount extends CustomAccessRequestAccount {
  serviceItem: PortalShopServiceitems;
  isOwned: boolean;
  isSelectable: boolean;
  isOwnedByCurrentUser: boolean;
  isRequestableForCurrentUser: boolean;
}

interface AccessRequestPerson extends CustomAccessRequestPerson {
  department: string;
  role: string;
}

interface AccountConfiguration {
  account: AccessRequestAccount;
  preview: ExtendedEntityWrapper<PortalCartitem>;
  form: FormGroup;
  pending: boolean;
}

@Component({
  selector: 'imx-custom-access-request',
  templateUrl: './custom-access-request.component.html',
  styleUrls: ['./custom-access-request.component.scss'],
})
export class CustomAccessRequestComponent implements OnInit {
  public readonly requestForm = createCustomAccessRequestForm();
  public accounts: AccessRequestAccount[] = [];
  public configurations: AccountConfiguration[] = [];
  public reports: AccessRequestPerson[] = [];
  public selectedReports = new Set<string>();
  public currentUser: AccessRequestPerson;
  public accountSearch = '';
  public employeeSearch = '';
  public visibleReportsCount = 10;
  public isLoading = true;
  public isSaving = false;
  public isSelectingAccounts = false;
  public isCheckingAccountAvailability = false;
  public errorMessage = '';
  private readonly createdCartItems: PortalCartitem[] = [];
  private accountEligibilityRequestId = 0;

  constructor(
    private readonly api: QerApiService,
    private readonly authentication: AuthenticationService,
    private readonly cartItems: CartItemsService,
    private readonly serviceItems: ServiceItemsService,
    private readonly shelfService: ShelfService,
    private readonly users: UserModelService,
    private readonly people: PersonService,
    private readonly requestBuilder: CustomAccessRequestRequestBuilder,
    private readonly loadingService: EuiLoadingService,
    private readonly snackBar: SnackBarService,
    private readonly logger: ClassloggerService,
    private readonly dialog: MatDialog,
    private readonly router: Router
  ) {}

  public async ngOnInit(): Promise<void> {
    const session = this.authentication.onSessionResponse.value;
    if (!session?.UserUid) {
      this.isLoading = false;
      this.errorMessage = '#LDS#The current user could not be determined.';
      return;
    }

    const overlay = this.loadingService.show();
    try {
      const personUid = session.UserUid;
      const personData = await this.people.get(personUid);
      this.currentUser = {
        uid: personUid,
        display: personData.Data[0]?.GetEntity().GetDisplay() || personUid,
        department: '',
        role: '',
      };

      const [serviceItems, reports] = await Promise.all([
        this.getAccountDefinitionServiceItems(personUid),
        this.users.getDirectReports(personUid),
      ]);

      this.accounts = serviceItems.map((item) => {
        const isOwned = this.hasOrderStatus(item, ['PERSONHASOBJECT', 'PERSONHASASSIGNMENTORDER', 'ASSIGNED']);
        const isRequestable = (item.IsRequestable === undefined || item.IsRequestable.value) && !isOwned;
        return {
          uid: item.GetEntity().GetKeys()[0],
          display: item.GetEntity().GetDisplay(),
          serviceItem: item,
          isOwned,
          isSelectable: isRequestable,
          isOwnedByCurrentUser: isOwned,
          isRequestableForCurrentUser: isRequestable,
        };
      });
      this.reports = reports.map((report) => this.mapReport(report));
    } catch (error) {
      this.logger.error(this, error);
      this.errorMessage = '#LDS#The access request data could not be loaded.';
      this.snackBar.open({ key: this.errorMessage });
    } finally {
      this.loadingService.hide(overlay);
      this.isLoading = false;
    }
  }

  public get filteredAccounts(): AccessRequestAccount[] {
    const search = this.accountSearch.trim().toLocaleLowerCase();
    return search ? this.accounts.filter((account) => account.display.toLocaleLowerCase().includes(search)) : this.accounts;
  }

  public get filteredReports(): AccessRequestPerson[] {
    return this.matchingReports.slice(0, this.visibleReportsCount);
  }

  public get matchingReports(): AccessRequestPerson[] {
    const search = this.employeeSearch.trim().toLocaleLowerCase();
    return search
      ? this.reports.filter((person) => `${person.display} ${person.department} ${person.role}`.toLocaleLowerCase().includes(search))
      : this.reports;
  }

  public get allVisibleReportsSelected(): boolean {
    return this.filteredReports.length > 0 && this.filteredReports.every((person) => this.selectedReports.has(person.uid));
  }

  public get selectedPeople(): AccessRequestPerson[] {
    return this.reports.filter((person) => this.selectedReports.has(person.uid));
  }

  public get isValid(): boolean {
    return (
      this.configurations.length > 0 &&
      this.requestForm.valid &&
      this.configurations.every((configuration) => configuration.form.valid && !configuration.pending) &&
      !this.isSaving
    );
  }

  public isSelected(account: AccessRequestAccount): boolean {
    return this.configurations.some((configuration) => configuration.account.uid === account.uid);
  }

  public get selectedAccountUids(): string[] {
    return this.configurations.map((configuration) => configuration.account.uid);
  }

  public async changeSelectedAccounts(selectedUids: string[]): Promise<void> {
    if (this.isSelectingAccounts) {
      return;
    }
    this.isSelectingAccounts = true;
    const selected = new Set(selectedUids);
    try {
      for (const configuration of [...this.configurations]) {
        if (!selected.has(configuration.account.uid)) {
          await this.toggleAccount(configuration.account, false);
        }
      }
      for (const account of this.accounts) {
        if (selected.has(account.uid) && account.isSelectable && !this.isSelected(account)) {
          await this.toggleAccount(account, true);
        }
      }
    } finally {
      this.isSelectingAccounts = false;
    }
  }

  public async toggleAccount(account: AccessRequestAccount, selected: boolean): Promise<void> {
    if (selected) {
      if (this.isSelected(account)) {
        return;
      }
      const overlay = this.loadingService.show();
      try {
        const previewPerson = this.selectedPeople[0] || this.currentUser;
        const preview = await this.createCartItem(account, previewPerson);
        const configuration: AccountConfiguration = {
          account,
          preview,
          form: new FormGroup({}),
          pending: false,
        };
        this.configurations = [...this.configurations, configuration];
      } catch (error) {
        this.logger.error(this, error);
        this.snackBar.open({ key: '#LDS#The selected account definition could not be prepared for a request.' });
      } finally {
        this.loadingService.hide(overlay);
      }
      return;
    }

    const configuration = this.configurations.find((item) => item.account.uid === account.uid);
    if (configuration) {
      await this.removeCartItem(configuration.preview.typedEntity);
      this.configurations = this.configurations.filter((item) => item !== configuration);
    }
  }

  public async clearAccounts(): Promise<void> {
    const configurations = [...this.configurations];
    for (const configuration of configurations) {
      await this.removeCartItem(configuration.preview.typedEntity);
    }
    this.configurations = [];
  }

  public async toggleReport(person: AccessRequestPerson, selected: boolean): Promise<void> {
    if (selected) {
      this.selectedReports.add(person.uid);
    } else {
      this.selectedReports.delete(person.uid);
    }
    await this.refreshAccountEligibility();
  }

  public async toggleAllReports(selected: boolean): Promise<void> {
    this.filteredReports.forEach((person) => {
      if (selected) {
        this.selectedReports.add(person.uid);
      } else {
        this.selectedReports.delete(person.uid);
      }
    });
    await this.refreshAccountEligibility();
  }

  public loadMoreReports(): void {
    this.visibleReportsCount += 10;
  }

  public getInitials(display: string): string {
    return (display || '')
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0))
      .join('')
      .toLocaleUpperCase();
  }

  public addControl(configuration: AccountConfiguration, name: string, control: AbstractControl): void {
    configuration.form.removeControl(name);
    configuration.form.addControl(name, control);
    control.updateValueAndValidity();
  }

  public isMandatory(column: IEntityColumn): boolean {
    return column.GetMetadata().GetMinLength() > 0;
  }

  public async cancel(): Promise<void> {
    for (const cartItem of [...this.createdCartItems]) {
      await this.removeCartItem(cartItem);
    }
    await this.router.navigate(['']);
  }

  public async saveDraft(): Promise<void> {
    await this.processRequest(false);
  }

  public async submitRequest(): Promise<void> {
    await this.processRequest(true);
  }

  public isControlInvalid(controlName: string): boolean {
    const control = this.requestForm.get(controlName);
    return !!control && control.invalid && (control.dirty || control.touched);
  }

  private async processRequest(submit: boolean): Promise<void> {
    this.requestForm.markAllAsTouched();
    this.configurations.forEach((configuration) => configuration.form.markAllAsTouched());
    if (!this.isValid || this.isSaving) {
      return;
    }

    this.isSaving = true;
    const overlay = this.loadingService.show();
    const successful: CustomAccessRequestResult[] = [];
    const failed: CustomAccessRequestResult[] = [];
    const pairs = this.requestBuilder.build(
      this.configurations.map((configuration) => ({
        uid: configuration.account.uid,
        display: configuration.account.display,
      })),
      this.selectedPeople,
      this.currentUser
    );
    const itemForSelf = new Map<string, boolean>();
    let cartUid = '';
    let submitted = false;

    try {
      for (const pair of pairs) {
        const configuration = this.configurations.find((item) => item.account.uid === pair.account.uid);
        if (!configuration) {
          continue;
        }

        let createdForPair: PortalCartitem;
        try {
          let wrapper: ExtendedEntityWrapper<PortalCartitem>;
          if (pair.person.uid === this.currentUser.uid) {
            wrapper = configuration.preview;
            itemForSelf.set(pair.account.uid, true);
          } else {
            wrapper = await this.createCartItem(configuration.account, pair.person);
            createdForPair = wrapper.typedEntity;
            await this.copyParameters(configuration.preview, wrapper);
          }

          this.applyCommonValues(wrapper.typedEntity);
          await this.cartItems.save(wrapper);
          cartUid = cartUid || wrapper.typedEntity.UID_ShoppingCartOrder.value;
          successful.push({ person: pair.person.display, account: pair.account.display, success: true });
        } catch (error) {
          this.logger.error(this, error);
          if (createdForPair) {
            await this.removeCartItem(createdForPair);
          }
          failed.push({
            person: pair.person.display,
            account: pair.account.display,
            success: false,
            error: '#LDS#The request could not be saved for this employee.',
          });
        }
      }

      for (const configuration of this.configurations) {
        if (!itemForSelf.has(configuration.account.uid)) {
          await this.removeCartItem(configuration.preview.typedEntity);
        }
      }

      if (submit && successful.length > 0) {
        try {
          if (!cartUid) {
            throw new Error('The shopping cart identifier was not returned by the portal.');
          }
          const validation = await this.cartItems.submit(cartUid, CheckMode.CheckOnly);
          if (validation.HasErrors) {
            throw new Error('The shopping cart contains requests that failed validation.');
          }
          await this.cartItems.submit(cartUid, CheckMode.SubmitWithWarnings);
          submitted = true;
        } catch (error) {
          this.logger.error(this, error);
          successful.forEach((result) => {
            failed.push({ ...result, success: false, error: '#LDS#The request could not be submitted.' });
          });
          successful.length = 0;
        }
      }

      await this.dialog
        .open(CustomAccessRequestResultDialog, {
          width: 'min(640px, 90vw)',
          data: { successful, failed, submitted },
        })
        .afterClosed()
        .toPromise();

      if (successful.length > 0) {
        await this.router.navigate(['shoppingcart']);
      }
    } catch (error) {
      this.logger.error(this, error);
      this.snackBar.open({ key: '#LDS#The request could not be submitted. Your saved items remain in the shopping cart.' });
    } finally {
      this.loadingService.hide(overlay);
      this.isSaving = false;
    }
  }

  private async createCartItem(
    account: AccessRequestAccount,
    person: CustomAccessRequestPerson
  ): Promise<ExtendedEntityWrapper<PortalCartitem>> {
    const recipient: ValueStruct<string> = { DataValue: person.uid, DisplayValue: person.display };
    const requestables = this.serviceItems.getServiceItemsForPersons([account.serviceItem], [recipient]);
    if (!(await this.shelfService.setShops(requestables))) {
      throw new Error(`No requestable IT Shop shelf is available for ${account.display} and ${person.display}.`);
    }

    const created = await this.cartItems.createAndPost(requestables[0], undefined);
    const item = created.Data[0];
    if (!item) {
      throw new Error(`The portal did not return a cart item for ${account.display}.`);
    }
    this.createdCartItems.push(item);
    try {
      return await this.cartItems.getInteractiveCartitem(item.GetEntity().GetKeys()[0]);
    } catch (error) {
      await this.removeCartItem(item);
      throw error;
    }
  }

  private async getAccountDefinitionServiceItems(recipientUids: string): Promise<PortalShopServiceitems[]> {
    const pageSize = 500;
    const accountDefinitions = new Map<string, PortalShopServiceitems>();
    let startIndex = 0;

    while (true) {
      const result = await this.api.typedClient.PortalShopServiceitems.Get({
        UID_Person: recipientUids,
        StartIndex: startIndex,
        PageSize: pageSize,
      });
      result.Data
        .filter((item) => item.TableName.value?.toLocaleLowerCase() === 'tsbaccountdef')
        .forEach((item) => accountDefinitions.set(item.GetEntity().GetKeys()[0], item));

      startIndex += result.Data.length;
      if (result.Data.length === 0 || startIndex >= result.totalCount) {
        break;
      }
    }

    return Array.from(accountDefinitions.values());
  }

  private async refreshAccountEligibility(): Promise<void> {
    const requestId = ++this.accountEligibilityRequestId;
    const selectedPeople = this.selectedPeople;
    if (selectedPeople.length === 0) {
      this.accounts.forEach((account) => {
        account.isOwned = account.isOwnedByCurrentUser;
        account.isSelectable = account.isRequestableForCurrentUser;
      });
      this.isCheckingAccountAvailability = false;
      return;
    }

    this.isCheckingAccountAvailability = true;
    try {
      const recipientUids = selectedPeople.map((person) => person.uid).join(',');
      const serviceItems = await this.getAccountDefinitionServiceItems(recipientUids);
      if (requestId !== this.accountEligibilityRequestId) {
        return;
      }

      const availableItems = new Map(serviceItems.map((item) => [item.GetEntity().GetKeys()[0], item]));
      this.accounts.forEach((account) => {
        const serviceItem = availableItems.get(account.uid);
        if (!serviceItem) {
          account.isOwned = false;
          account.isSelectable = false;
          return;
        }

        account.isOwned = this.hasOrderStatus(serviceItem, ['PERSONHASOBJECT', 'PERSONHASASSIGNMENTORDER', 'ASSIGNED']);
        account.isSelectable =
          serviceItem.IsRequestable === undefined
            ? !account.isOwned
            : serviceItem.IsRequestable.value;
      });
    } catch (error) {
      if (requestId === this.accountEligibilityRequestId) {
        this.accounts.forEach((account) => (account.isSelectable = false));
        this.logger.error(this, error);
        this.snackBar.open({ key: '#LDS#Availability for the selected employees could not be checked.' });
      }
    } finally {
      if (requestId === this.accountEligibilityRequestId) {
        this.isCheckingAccountAvailability = false;
      }
    }
  }

  private hasOrderStatus(item: PortalShopServiceitems, statuses: string[]): boolean {
    const orderStatuses = MultiValue.FromString(item.OrderableStatus?.value || '').GetValues();
    return orderStatuses.some((status) => statuses.includes(status));
  }

  private async copyParameters(
    source: ExtendedEntityWrapper<PortalCartitem>,
    target: ExtendedEntityWrapper<PortalCartitem>
  ): Promise<void> {
    const sourceColumns = new Map(
      (source.parameterCategoryColumns || []).map((item) => [
        `${item.parameterCategoryName}_${item.column.ColumnName}`,
        item.column,
      ])
    );
    for (const item of target.parameterCategoryColumns || []) {
      const sourceColumn = sourceColumns.get(`${item.parameterCategoryName}_${item.column.ColumnName}`);
      if (sourceColumn) {
        await item.column.PutValue(sourceColumn.GetValue());
      }
    }
  }

  private applyCommonValues(item: PortalCartitem): void {
    item.OrderReason.value = this.requestForm.get('reason').value;
    item.ValidFrom.value = new Date(this.requestForm.get('validFrom').value);
    item.ValidUntil.value = new Date(this.requestForm.get('validUntil').value);
  }

  private async removeCartItem(item: PortalCartitem): Promise<void> {
    const key = item.GetEntity().GetKeys()[0];
    if (!key) {
      return;
    }
    await this.cartItems.removeItems([item]);
    const index = this.createdCartItems.findIndex((candidate) => candidate.GetEntity().GetKeys()[0] === key);
    if (index >= 0) {
      this.createdCartItems.splice(index, 1);
    }
  }

  private mapReport(report: PortalPersonReports): AccessRequestPerson {
    const entity = report.GetEntity();
    return {
      uid: entity.GetKeys()[0],
      display: entity.GetDisplay(),
      department: entity.GetColumn('UID_Department')?.GetDisplayValue() || '',
      role: report.EmployeeType.value || '',
    };
  }
}
