import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { EuiCoreModule, EuiMaterialModule } from '@elemental-ui/core';
import {
  CdrModule,
  ClassloggerService,
  LdsReplaceModule,
  MenuItem,
  MenuService,
  QbmModule,
} from 'qbm';
import { CustomAccessRequestComponent } from './custom-access-request.component';
import { CustomAccessRequestResultDialog } from './custom-access-request-result.dialog';
import { CustomAccessRequestRoutingModule } from './custom-access-request-routing.module';

@NgModule({
  declarations: [CustomAccessRequestComponent, CustomAccessRequestResultDialog],
  imports: [
    CommonModule,
    CdrModule,
    EuiCoreModule,
    EuiMaterialModule,
    FormsModule,
    LdsReplaceModule,
    QbmModule,
    ReactiveFormsModule,
    RouterModule,
    CustomAccessRequestRoutingModule,
    TranslateModule,
  ],
})
export class CustomAccessRequestModule {
  constructor(private readonly menuService: MenuService, logger: ClassloggerService) {
    logger.info(this, '▶️ CustomAccessRequestModule loaded');
    this.setupMenu();
  }

  private setupMenu(): void {
    this.menuService.addMenuFactories((preProps: string[]) => {
      if (!preProps.includes('ITSHOP')) {
        return null;
      }

      const item: MenuItem = {
        id: 'QER_Requests_AccessRequest',
        route: 'accessrequest',
        title: '#LDS#Access Requests',
        sorting: '10-12',
      };
      return {
        id: 'ROOT_Request',
        title: '#LDS#Requests',
        sorting: '10',
        items: [item],
      };
    });
  }
}
