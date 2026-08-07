import Link from "next/link";
import GitHubIcon from "@/components/GitHubIcon";

export default function Footer() {
  return (
    <footer>
      <span>SM_BtechSyllabus · 3rd Semester</span>
      <a
        className="github-link"
        href="https://github.com/Sayantan-B-dev/SM_BtechSyllabus"
        target="_blank"
        rel="noopener noreferrer"
      >
        <GitHubIcon />
        GitHub · SM_BtechSyllabus
      </a>
      <Link className="master-link" href="/admin">Master Login</Link>
    </footer>
  );
}