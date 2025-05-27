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
  });
  
  const Users = mongoose.model('User', userSchema);
  
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
    }
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
    role: {
      type: String,
      required: true,
    },
    email: String,
    phone: String,
    meetings: [String],
  }, {
    _id: false // Prevents Mongoose from adding its own _id to each subdoc
  });

  const attendeeSchema = new mongoose.Schema({
    id:   { type: String, required: true },
    name: { type: String, required: true },
    email: { type: String, required: false },
  }, { _id: false });

  
  const actionItemSchema = new mongoose.Schema({
    id: String,
    title: String,
    dueDate: Date,
    completed: Boolean,
    completedAt: Date,
    interactionId: String,
  }, {
    timestamps: true
  });
  
  const interactionSchema = new mongoose.Schema({
    id: String,
    type: {
      type: String,
    },
    timestamp: Date,
    createdAt: Date,
    createdBy: userSummarySchema,
    updatedAt: Date,
    updatedBy: userSummarySchema,
    title: String,
    description: String,
    metadata: {
      meetingId: String,
      duration: Number,
    },
    attendees: [attendeeSchema],
    actionItems: [actionItemSchema],
    isSticky: Boolean,
  }, {
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
      default: 'prospect',
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
    metrics: metricsSchema,
  }, {
    timestamps: true
  });
  
  const Accounts = mongoose.model('Account', accountSchema);

  export { Users, Accounts };

