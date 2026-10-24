import jwt from "jsonwebtoken";

export const generateToken = (id: string, role: string): string => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET as string, {
    expiresIn: "7d",
  } as jwt.SignOptions);
};

export const isDeadlinePassed = (deadline: Date): boolean => {
  return new Date() > new Date(deadline);
};

export const formatError = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  return String(error);
};
