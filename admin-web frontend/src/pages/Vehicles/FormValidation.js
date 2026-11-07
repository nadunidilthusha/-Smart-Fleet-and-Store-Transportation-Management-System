// Shared validation helpers aligned to the FleetLine Add Vehicle fields

// Check whether a string value is present after trimming whitespace
export const isRequired = (value) => String(value ?? "").trim().length > 0;

// Validate a non-negative numeric value used for capacity, mileage, and service km
export const isNonNegativeNumber = (value) => {
  if (!isRequired(value)) return false;
  const normalized = String(value).replace(/,/g, "").trim();
  return /^\d+(\.\d+)?$/.test(normalized) && Number(normalized) >= 0;
};

// Validate that a date string is present and parseable
export const isValidDate = (value) => {
  if (!isRequired(value)) return false;
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime());
};

// Validate uploaded document list has at least one accepted file
export const hasUploadedDocuments = (files) => Array.isArray(files) && files.length > 0;

// Build a field-error map for the FleetLine Add Vehicle form payload
export const validateVehicleForm = (formData, { asDraft = false } = {}) => {
  const errors = {};

  // Draft saves only require the core identity fields
  if (!isRequired(formData.vehicleId)) {
    errors.vehicleId = "Vehicle ID is required.";
  }
  if (!isRequired(formData.plateNumber)) {
    errors.plateNumber = "Plate number is required.";
  }

  // Full submit enforces the complete induction checklist
  if (!asDraft) {
    if (!isRequired(formData.vehicleTypeModel)) {
      errors.vehicleTypeModel = "Select a vehicle type and model.";
    }
    if (!isNonNegativeNumber(formData.capacityKg)) {
      errors.capacityKg = "Enter a valid capacity in kg.";
    }
    if (!isRequired(formData.assignedDriver)) {
      errors.assignedDriver = "Select an assigned driver.";
    }
    if (!isRequired(formData.currentHub)) {
      errors.currentHub = "Select a current location / hub.";
    }
    if (!isNonNegativeNumber(formData.initialMileage)) {
      errors.initialMileage = "Enter a valid initial mileage.";
    }
    if (formData.fuelLevel === "" || formData.fuelLevel == null) {
      errors.fuelLevel = "Set the current fuel level.";
    }
    if (!isRequired(formData.operationalStatus)) {
      errors.operationalStatus = "Select an operational status.";
    }
    if (!isValidDate(formData.revenueLicenseExpiry)) {
      errors.revenueLicenseExpiry = "Revenue license expiry is required.";
    }
    if (!isNonNegativeNumber(formData.nextServiceDueKm)) {
      errors.nextServiceDueKm = "Enter the next service due mileage.";
    }
    if (!isRequired(formData.insurancePolicyRef)) {
      errors.insurancePolicyRef = "Insurance policy / permit ref is required.";
    }
    if (!hasUploadedDocuments(formData.documents)) {
      errors.documents = "Upload at least one vehicle document.";
    }
  }

  return errors;
};

// Convenience helper that reports whether the form currently has any errors
export const isVehicleFormValid = (formData, options) =>
  Object.keys(validateVehicleForm(formData, options)).length === 0;
