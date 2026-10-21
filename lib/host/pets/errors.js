// packages/host/src/pets/errors.ts
var PetRefusal = class extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
    this.name = "PetRefusal";
  }
  status;
};
export {
  PetRefusal
};
