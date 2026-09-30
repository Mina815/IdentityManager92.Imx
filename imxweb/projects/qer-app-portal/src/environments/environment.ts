/*
 * ONE IDENTITY LLC. PROPRIETARY INFORMATION
 *
 * This software is confidential.  One Identity, LLC. or one of its affiliates or
 * subsidiaries, has supplied this software to you under terms of a
 * license agreement, nondisclosure agreement or both.
 *
 * You may not copy, disclose, or use this software except in accordance with
 * those terms.
 *
 *
 * Copyright 2023 One Identity LLC.
 * ALL RIGHTS RESERVED.
 *
 * ONE IDENTITY LLC. MAKES NO REPRESENTATIONS OR
 * WARRANTIES ABOUT THE SUITABILITY OF THE SOFTWARE,
 * EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED
 * TO THE IMPLIED WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE, OR
 * NON-INFRINGEMENT.  ONE IDENTITY LLC. SHALL NOT BE
 * LIABLE FOR ANY DAMAGES SUFFERED BY LICENSEE
 * AS A RESULT OF USING, MODIFYING OR DISTRIBUTING
 * THIS SOFTWARE OR ITS DERIVATIVES.
 *
 */

// This file can be replaced during build by using the `fileReplacements` array.
// `ng build --prod` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.
function resolveClientUrl(): string {
  const href = window.location.href;
  const idx = href.indexOf('/html/');
  // Deployed under IIS: https://<host>/ApiServer1/html/qer-app-portal/...
  // -> https://<host>/ApiServer1
  if (idx > -1) {
    return href.substring(0, idx);
  }
  // ng serve fallback (no /html/ in the path)
  return 'http://localhost:8182';
}

export const environment = {
  production: false,
  clientUrl: resolveClientUrl(),
  appName: 'qer-app-portal',
  appVersion: '1.0.0'
};
// export const environment = {
//   production: false,
//   clientUrl: 'http://localhost:8182',
//   // clientUrl: 'https://win-bkaap1tejp6.iamlab.local/ApiServer1/', 
//   // clientUrl: 'https://localhost/ApiServer1/', 
//   appName: 'qer-app-portal',
//   appVersion: '1.0.0'
// };


/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/dist/zone-error';  // Included with Angular CLI.