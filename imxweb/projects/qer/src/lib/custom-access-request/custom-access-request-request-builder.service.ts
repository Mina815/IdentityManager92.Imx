import { Injectable } from '@angular/core';

export interface CustomAccessRequestAccount {
  uid: string;
  display: string;
}

export interface CustomAccessRequestPerson {
  uid: string;
  display: string;
}

export interface CustomAccessRequestPair {
  account: CustomAccessRequestAccount;
  person: CustomAccessRequestPerson;
}

@Injectable({
  providedIn: 'root',
})
export class CustomAccessRequestRequestBuilder {
  public build(
    accounts: CustomAccessRequestAccount[],
    selectedPeople: CustomAccessRequestPerson[],
    currentUser: CustomAccessRequestPerson
  ): CustomAccessRequestPair[] {
    const people = selectedPeople.length > 0 ? selectedPeople : [currentUser];
    return people.reduce(
      (pairs, person) => pairs.concat(accounts.map((account) => ({ account, person }))),
      [] as CustomAccessRequestPair[]
    );
  }
}
