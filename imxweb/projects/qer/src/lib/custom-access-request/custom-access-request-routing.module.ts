import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HELP_CONTEXTUAL, RouteGuardService } from 'qbm';
import { RequestsFeatureGuardService } from '../requests-feature-guard.service';
import { CustomAccessRequestComponent } from './custom-access-request.component';

const routes: Routes = [
  {
    path: 'accessrequest',
    component: CustomAccessRequestComponent,
    canActivate: [RequestsFeatureGuardService],
    resolve: [RouteGuardService],
    data: { contextId: HELP_CONTEXTUAL.NewRequest },
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class CustomAccessRequestRoutingModule {}
