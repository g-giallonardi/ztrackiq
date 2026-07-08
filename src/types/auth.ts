export type AuthUser = {
  id: number;
  firstname: string;
  lastname: string | null;
  nickname: string | null;
  email: string;
  role: string;
};
