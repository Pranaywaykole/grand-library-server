/* ================================
   models/User.js
   Defines what a user looks like
   in the database and how it behaves.
   ================================ */

const mongoose = require('mongoose')
const bcrypt   = require('bcryptjs')

/*
  Schema definition — the blueprint for every
  user document stored in MongoDB.
  Think of it like defining a class with
  field types, validation rules, and defaults.
*/
const userSchema = new mongoose.Schema(
  {
    /* ── Basic Information ── */

    username: {
      type:      String,
      required:  [true, 'Username is required'],
      unique:    true,
      trim:      true,          /* removes whitespace from both ends */
      minlength: [3, 'Username must be at least 3 characters'],
      maxlength: [30, 'Username cannot exceed 30 characters'],
      /*
        match validates against a regex.
        This only allows letters, numbers, underscores, hyphens.
      */
      match: [
        /^[a-zA-Z0-9_-]+$/,
        'Username can only contain letters, numbers, underscores, and hyphens'
      ],
    },

    email: {
      type:     String,
      required: [true, 'Email is required'],
      unique:   true,
      trim:     true,
      lowercase: true,          /* always store email in lowercase */
      match: [
        /^\S+@\S+\.\S+$/,
        'Please provide a valid email address'
      ],
    },

    password: {
      type:      String,
      required:  [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      /*
        select: false means password is NEVER included
        in query results by default.
        You must explicitly request it with .select('+password')
        This prevents accidentally sending passwords to the client.
      */
      select: false,
    },


    /* ── Character ── */

    character: {
      name: {
        type:    String,
        default: '',
      },
      emoji: {
        type:    String,
        default: '',
      },
    },


    /* ── Favourite Books ── */

    favourites: [
      {
        bookId: {
          type:     Number,
          required: true,
        },
        title: {
          type:     String,
          required: true,
        },
        cover: {
          type:    String,
          default: '',
        },
        addedAt: {
          type:    Date,
          default: Date.now,
        },
      }
    ],


    /* ── Reading History ── */

    readingHistory: [
      {
        bookId: {
          type:     Number,
          required: true,
        },
        title: {
          type:     String,
          required: true,
        },
        cover: {
          type:    String,
          default: '',
        },
        lastPage: {
          type:    Number,
          default: 0,
        },
        readAt: {
          type:    Date,
          default: Date.now,
        },
      }
    ],


    /* ── Reading Preferences ── */

    preferences: {
      theme:    { type: String, default: 'sepia' },
      fontSize: { type: Number, default: 17 },
    },


    /* ── Account Status ── */

    isActive: {
      type:    Boolean,
      default: true,
    },
  },

  {
    /*
      timestamps: true automatically adds two fields:
      createdAt — when the document was first created
      updatedAt — when the document was last modified
      Mongoose manages these for you.
    */
    timestamps: true,
  }
)


/* ─────────────────────────────────
   MIDDLEWARE — Hash Password Before Save

   This is a Mongoose pre-save hook.
   It runs automatically BEFORE every
   document.save() call.

   We use it to hash the password so
   we never store plain text passwords
   in the database.
   ───────────────────────────────── */

userSchema.pre('save', async function () {
  /*
    Only hash password if modified
  */
  if (!this.isModified('password')) return

  /*
    Generate salt
  */
  const salt = await bcrypt.genSalt(12)

  /*
    Hash password
  */
  this.password = await bcrypt.hash(this.password, salt)
})


/* ─────────────────────────────────
   INSTANCE METHOD — Compare Password

   Instance methods are functions you
   can call on any user document.
   user.comparePassword("attempt") returns
   true if the attempt matches the stored hash.
   ───────────────────────────────── */

userSchema.methods.comparePassword = async function(candidatePassword) {
  /*
    bcrypt.compare hashes the candidate password
    with the same salt used originally and
    checks if it matches the stored hash.
    This is the only way to verify a bcrypt password.
  */
  return bcrypt.compare(candidatePassword, this.password)
}


/* ─────────────────────────────────
   INSTANCE METHOD — To Safe Object

   Returns user data without sensitive fields.
   Use this whenever sending user data
   to the client.
   ───────────────────────────────── */

userSchema.methods.toSafeObject = function() {
  const obj = this.toObject()
  delete obj.password   /* never send password */
  delete obj.__v        /* remove mongoose version key */
  return obj
}


/*
  mongoose.model() creates the Model class.
  First argument: the model name ('User')
  MongoDB will create a collection called 'users'
  (lowercase, pluralized automatically).
  Second argument: the schema to use.
*/
const User = mongoose.model('User', userSchema)

module.exports = User