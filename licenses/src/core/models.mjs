import mongoose from 'mongoose';

const InvasionSchema = new mongoose.Schema({
  type: String,
  properties: {},
  geometry: {},
  tweeted: {
    type: Boolean,
    default: false
  },
  created_at: {
    type: Date,
    default: new Date()
  }
});

// InvasionSchema.index({ geometry: "2dsphere" });

export const Invasion = mongoose.model('Invasion', InvasionSchema);

const UnitySchema = new mongoose.Schema({
  type: String,
  properties: {},
  geometry: {}
});

// UnitySchema.index({ geometry: "2dsphere" });

export const Unity = mongoose.model('Unity', UnitySchema);

const LicenseSchema = new mongoose.Schema({
  type: String,
  properties: {},
  geometry: {}
});

// LicenseSchema.index({ "properties.ULT_EVENTO": "text" });
// LicenseSchema.index({ geometry: "2dsphere" });

export const License = mongoose.model('License', LicenseSchema);

const ReserveSchema = new mongoose.Schema({
  type: String,
  properties: {},
  geometry: {}
});

export const Reserve = mongoose.model('Reserve', ReserveSchema);

const ReserveInvasionSchema = new mongoose.Schema({
  type: String,
  properties: {},
  geometry: {},
  tweeted: {
    type: Boolean,
    default: false
  },
  created_at: {
    type: Date,
    default: new Date()
  }
});

export const ReserveInvasion = mongoose.model('ReserveInvasion', ReserveInvasionSchema);