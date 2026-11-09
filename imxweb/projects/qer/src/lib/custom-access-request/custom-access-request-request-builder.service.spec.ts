import { CustomAccessRequestRequestBuilder } from './custom-access-request-request-builder.service';

describe('CustomAccessRequestRequestBuilder', () => {
  let builder: CustomAccessRequestRequestBuilder;

  beforeEach(() => {
    builder = new CustomAccessRequestRequestBuilder();
  });

  it('builds one request for every selected person and account', () => {
    const accounts = [
      { uid: 'account-1', display: 'Account 1' },
      { uid: 'account-2', display: 'Account 2' },
    ];
    const people = [
      { uid: 'person-1', display: 'Person 1' },
      { uid: 'person-2', display: 'Person 2' },
    ];

    expect(builder.build(accounts, people, { uid: 'current-user', display: 'Current user' })).toEqual([
      { account: accounts[0], person: people[0] },
      { account: accounts[1], person: people[0] },
      { account: accounts[0], person: people[1] },
      { account: accounts[1], person: people[1] },
    ]);
  });

  it('uses the current user when no employee is selected', () => {
    const account = { uid: 'account-1', display: 'Account 1' };
    const currentUser = { uid: 'current-user', display: 'Current user' };

    expect(builder.build([account], [], currentUser)).toEqual([{ account, person: currentUser }]);
  });
});
