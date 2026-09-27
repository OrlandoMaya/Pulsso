// Transforma documentos de Mongo a JSON de API: _id → id, sin __v ni userId
export const toJSONOptions = {
  virtuals: true,
  versionKey: false,
  transform: (_doc: unknown, ret: Record<string, any>) => {
    ret.id = String(ret._id);
    delete ret._id;
    delete ret.userId;
    delete ret.passwordHash;
    return ret;
  },
};
