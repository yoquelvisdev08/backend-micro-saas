const mongoose = require('mongoose');

const siteSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Por favor proporciona un nombre de sitio'],
      trim: true,
      maxlength: [100, 'El nombre no puede exceder 100 caracteres']
    },
    url: {
      type: String,
      required: [true, 'Por favor proporciona una URL'],
      trim: true,
      match: [
        /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w.-]*)*\/?$/,
        'Por favor proporciona una URL válida'
      ]
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'pending'],
      default: 'active'
    }
  },
  { timestamps: true }
);

// Índice compuesto para evitar duplicados por usuario
siteSchema.index({ url: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('Site', siteSchema); 