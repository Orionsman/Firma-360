export const enSettings = {
  title: 'Settings',
  kicker: 'ACCOUNT AND APPEARANCE',
  subtitle: 'Manage your account, company details, and preferences in one place.',
  switchToLight: 'Switch to light mode',
  switchToDark: 'Switch to dark mode',
  language: 'Language',
  languageDescription: 'Choose the app language.',
  companyInfo: 'Company Information',
  companyNotFound: 'No company found to edit.',
  companyNameRequired: 'Company name cannot be empty.',
  companyUpdated: 'Company details updated.',
  companySaveFailed: 'Could not save company details.',
  showCompanyEditor: 'Edit Company Details',
  hideCompanyEditor: 'Hide Company Details',
  fields: {
    taxNumber: 'Tax Number',
    deletionReason: 'Deletion Reason (Optional)',
  },
  password: {
    title: 'Change Password',
    placeholder: 'At least 6 characters',
    tooShort: 'New password must be at least 6 characters.',
    updated: 'Your password has been updated.',
    updateFailed: 'Could not update your password.',
    action: 'Update Password',
    updating: 'Updating...',
  },
  about: {
    title: 'About',
    text:
      'CepteCari helps you manage receivables and payables with ease, so your business records are always within reach.',
    privacy: 'Open Privacy Policy',
    deletionInfo: 'Open Account Deletion Details',
  },
  deletion: {
    title: 'Account Deletion',
    text:
      'You can submit an account deletion request here. Once submitted, it will be processed in the background and may not be reversible.',
    placeholder: 'You can write a short note about your request.',
    inlineInfo:
      'When the process is complete, your account data will be deleted or anonymized.',
    action: 'Submit Deletion Request',
    requesting: 'Sending request...',
    confirmTitle: 'Submit account deletion request?',
    confirmText:
      'This will record your deletion request. It will be processed in the background, and any data that does not need to be retained for legal reasons will be deleted or anonymized.',
    confirmAction: 'Send Request',
    receivedTitle: 'Request Received',
    receivedText:
      'Your deletion request has been recorded and will be completed in the background.',
    failed: 'Account could not be deleted.',
  },
  logout: 'Sign Out',
  logoutFailed: 'Could not sign out.',
} as const;
