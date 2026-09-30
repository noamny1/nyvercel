import "next-auth";

declare module "next-auth" {
  interface User {
    remember?: boolean;
  }
}
