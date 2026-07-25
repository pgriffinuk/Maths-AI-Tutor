import Logo from './Logo';

export default function MarketingHeader() {
  return (
    <header className="marketing-topbar">
      <Logo />
      <a className="marketing-login-link" href="/login">Log in</a>
    </header>
  );
}
