export const enSettings = {
  title: 'Settings',
  kicker: 'ACCOUNT AND APPEARANCE',
  subtitle: 'Manage your account, company details, and preferences in one place.',
  switchToLight: 'Switch to light mode',
  switchToDark: 'Switch to dark mode',
  language: 'Language',
  languageTitle: 'Language Settings',
  languageDescription: 'Choose the app language.',
  activeLanguage: 'Active language',
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
    title: 'Legal and Support',
    text:
      'Use this section to access privacy, account deletion, terms of service, KVKK notice, and support information.',
    privacy: 'Open Privacy Policy',
    deletionInfo: 'Open Account Deletion Details',
    terms: 'Open Terms of Service',
    kvkk: 'Open KVKK Notice',
    support: 'Open Support Information',
  },
  proTools: {
    title: 'Pro Tools',
    text:
      'Manage multi-company access, team members, cloud backups, and collection reminders.',
    action: 'Open Business Tools',
  },
  deletion: {
    title: 'Delete Account Permanently',
    text:
      'You can permanently delete your account and associated app data here. Data that must be retained for legal or security reasons may be kept as required.',
    placeholder: 'You can write a short note about the deletion.',
    inlineInfo:
      'When the process is complete, your session will be closed and your account data will be deleted or anonymized.',
    action: 'Delete Account Permanently',
    requesting: 'Deleting account...',
    confirmTitle: 'Delete account permanently?',
    confirmText:
      'This action cannot be undone. Your account and associated app data will be deleted or anonymized.',
    confirmAction: 'Delete Account',
    receivedTitle: 'Account Deleted',
    receivedText:
      'Your account has been deleted successfully and you have been signed out.',
    failed: 'Account could not be deleted.',
  },
  logout: 'Sign Out',
  logoutFailed: 'Could not sign out.',
} as const;
