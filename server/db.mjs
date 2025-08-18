import e from 'express';
import mongoose from 'mongoose'

mongoose.connect(process.env["GENEZIO_CRM_DATABASE_URL1"] || process.env["GENEZIO_CRM_DATABASE_URL"]);

const userSchema = new mongoose.Schema({
    userId: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
    },
    address: {
      type: String,
      required: false,
    },
    phone: {
      type: String,
      required: false,
    },
    emailCode: {
      type: String,
      required: false,
    },
  });
  
  const Users = mongoose.model('User', userSchema);

  const activeSessionSchema = new mongoose.Schema({
    userId: {
      type: String,
      required: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
    },
    date: {
      type: Date,
      default: Date.now,
    },
  });

  const ActiveSessions = mongoose.model('ActiveSessions', activeSessionSchema);
  
  const userSummarySchema = new mongoose.Schema({
    id: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: false,
    },
  }, {
    _id: false // Prevents Mongoose from adding its own _id to each subdoc
  });
  
  const employeeSchema = new mongoose.Schema({
    id: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    role: String,
    email: String,
    phone: String,
    notes: String,
  }, {
    _id: false // Prevents Mongoose from adding its own _id to each subdoc
  });

  const attendeeSchema = new mongoose.Schema({
    id:   { type: String, required: true },
    name: { type: String, required: true },
    email: { type: String, required: false },
    phone: { type: String, required: false },
  }, { _id: false });
  
  const actionItemSchema = new mongoose.Schema({
    id: {
      type: String,
      required: true,
      unique: true,
    },
    title: {
      type: String,
      required: true,
    },
    dueDate: {
      type: Date,
      required: true,
    },
    completed: {
      type: Boolean,
      default: false,
    },
    completedAt: {
      type: Date,
      required: false,
    },
    assignedTo: {
      type: userSummarySchema,
      required: false,
    },
  }, {
    timestamps: true
  });

  const interactionJson = {
    type: {
      type: String,
      enum: ['call', 'email', 'meeting', "whatsapp", 'note', 'status_change', 'sticky_note'],
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    attendees: {
      type: [attendeeSchema],
      required: true,
    },
    isSticky: {
      type: Boolean,
      default: false,
    },
    metadata: {
      meetingId: String,
      duration: Number,
    },
  }

  const basicInteractionMongooseSchema = new mongoose.Schema(interactionJson, {
    _id: false // Prevents Mongoose from adding its own _id to each subdoc
  });

  // append propertis of "a" to "basicInteractionJson"
  Object.assign(interactionJson, {
    id: String,
    createdAt: Date,
    createdBy: userSummarySchema,
    updatedAt: Date,
    updatedBy: userSummarySchema,
  });
  
  const interactionSchema = new mongoose.Schema(interactionJson, {
    _id: false // Prevents Mongoose from adding its own _id to each subdoc
  });
  
  const metricsSchema = new mongoose.Schema({
    contractValue: Number,
    pocValue: Number,
    probability: Number,
  }, {
    _id: false // Prevents Mongoose from adding its own _id to each subdoc
  });
  
  const accountSchema = new mongoose.Schema({
    id: {
      type: String,
      required: true,
      unique: true,
    },
    name: String,
    description: String,
    domain: String,
    industry: String,
    accountType: {
      type: String,
      enum: ['Client', 'Partner'],
      default: 'Client',
    },
    website: String,
    status: {
      type: String,
      default: 'Prospect',
    },
    owner: userSummarySchema,
    teamMembers: {
        type: [userSummarySchema],
        default: [],
    },
    employees: {
        type: [employeeSchema],
        default: [],
    },
    interactions: {
        type: [interactionSchema],
        default: [],
    },
    actionItems: {
      type: [actionItemSchema],
      default: [],
    },
    metrics: metricsSchema,
  }, {
    timestamps: true
  });
  
  const Accounts = mongoose.model('Account', accountSchema);
  const UserSummary = mongoose.model('UserSummary', userSummarySchema);
  const Employee = mongoose.model('Employee', employeeSchema);
  const Attendee = mongoose.model('Attendee', attendeeSchema);
  const ActionItem = mongoose.model('ActionItem', actionItemSchema);
  const Interaction = mongoose.model('Interaction', interactionSchema);
  const BasicInteraction = mongoose.model('BasicInteraction', basicInteractionMongooseSchema);

  export { Users, Accounts, UserSummary, Employee, Attendee, ActionItem, BasicInteraction, Interaction, ActiveSessions };

