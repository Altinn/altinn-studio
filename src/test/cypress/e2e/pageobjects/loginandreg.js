//Selectors in the login and user registration page
export const login = {
  userName: '#user_name',
  userPwd: '#password',
  loginButton: "input[type='button']",
  submit: 'button',
  errorMessage: '.ui.negative.message',
  container: '.container',
  form: 'form[action="/repos/user/login"]',
};

export const registration = {
  singUp: "a[href='/repos/user/sign_up']",
  reTypePwd: '#retype',
  email: '#email',
};
