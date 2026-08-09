"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Home" },
  { href: "/modules/python", label: "Python Lab" },
  { href: "/modules/dbms", label: "DBMS" },
  { href: "/modules/coa", label: "COA" },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link href="/" className="navbar-brand">
          <Image src="/icon-32.png" alt="BWU" width={32} height={32} priority />
          <span className="navbar-title">BWU</span>
        </Link>

        <div className="navbar-links">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`navbar-link${pathname === l.href || (l.href !== "/" && pathname.startsWith(l.href)) ? " active" : ""}`}
            >
              {l.label}
            </Link>
          ))}
        </div>

        <Link
          href="/admin"
          className={`navbar-link navbar-admin${pathname.startsWith("/admin") ? " active" : ""}`}
        >
          Admin
        </Link>
      </div>
    </nav>
  );
}
