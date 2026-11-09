// Shared validation helpers for the Add Store & Warehouse form

// Check whether a string value is present after trimming whitespace
export const isRequired = (value) => String(value ?? "").trim().length > 0;

// Validate a positive number for capacity, threshold, and dock counts
export const isPositiveNumber = (value) => {
  if (!isRequired(value)) return false;
  const normalized = String(value).replace(/,/g, "").trim();
  return /^\d+(\.\d+)?$/.test(normalized) && Number(normalized) > 0;
};

// Light email format check for the dispatch contact field
export const isValidEmail = (value) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value ?? "").trim());

// Build a field-error map for draft or full store submission
export const validateStoreForm = (formData, { asDraft = false } = {}) => {
  const errors = {};

  // Draft saves still require the store identity fields
  if (!isRequired(formData.storeCode)) {
    errors.storeCode = "Store code is required.";
  }
  if (!isRequired(formData.storeName)) {
    errors.storeName = "Store / warehouse name is required.";
  }

  // Full submit enforces the complete registration checklist
  if (!asDraft) {
    if (!isRequired(formData.storeType)) {
      errors.storeType = "Select a store type.";
    }
    if (!isRequired(formData.operationalStatus)) {
      errors.operationalStatus = "Select an initial operational status.";
    }
    if (!isRequired(formData.managerName)) {
      errors.managerName = "Manager name is required.";
    }
    if (!isRequired(formData.contactPhone)) {
      errors.contactPhone = "Contact phone is required.";
    }
    if (!isValidEmail(formData.dispatchEmail)) {
      errors.dispatchEmail = "Enter a valid dispatch email.";
    }
    if (!isRequired(formData.district)) {
      errors.district = "Select a district.";
    }
    if (!isRequired(formData.address)) {
      errors.address = "Physical facility address is required.";
    }
    if (!isPositiveNumber(formData.storageCapacity)) {
      errors.storageCapacity = "Enter a valid storage capacity.";
    }
    if (!isPositiveNumber(formData.alertThreshold)) {
      errors.alertThreshold = "Enter a valid alert threshold.";
    }
    // Loading bays are optional in the mock; only validate when provided
    if (
      String(formData.loadingBays ?? "").trim() !== "" &&
      !isPositiveNumber(formData.loadingBays)
    ) {
      errors.loadingBays = "Enter a valid number of loading bays.";
    }
    if (!Array.isArray(formData.assignedVehicles) || formData.assignedVehicles.length === 0) {
      errors.assignedVehicles = "Allocate at least one fleet vehicle.";
    }
  }

  return errors;
};
