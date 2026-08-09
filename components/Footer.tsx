import Link from "next/link";
import Image from "next/image";
import GitHubIcon from "@/components/GitHubIcon";

export default function Footer() {
  return (
    <footer>
      <Link href="/" className="footer-brand">
        <Image src="/icon-32.png" alt="BWU" width={24} height={24} />
        <span>© {new Date().getFullYear()} Sayantan</span>
      </Link>
      <a
        className="github-link"
        href="https://github.com/Sayantan-B-dev/SM_BtechSyllabus"
        target="_blank"
        rel="noopener noreferrer"
      >
        <GitHubIcon />
        GitHub
      </a>
      <Link className="master-link" href="/admin">Master Login</Link>
    </footer>
  );
}