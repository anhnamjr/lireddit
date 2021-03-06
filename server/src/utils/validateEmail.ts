export const validateEmail = (email: string) => {
  return email.match(
    /^[a-z][a-z0-9_\.]{5,32}@[a-z0-9]{2,}(\.[a-z0-9]{2,4}){1,2}$/
  );
};
