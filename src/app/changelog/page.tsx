import fs from "fs";
import path from "path";
import ReactMarkdown from "react-markdown";

const changelogPath = path.join(process.cwd(), "CHANGELOG.md");
const changelogContent = fs.readFileSync(changelogPath, "utf-8");

export default function ChangelogPage() {
  return (
    <main className="container mx-auto px-4 py-8 max-w-3xl">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-base-content mb-2">Changelog</h1>
        <p className="text-base-content/70">
          All notable changes to Drugucopia. Based on{" "}
          <a
            href="https://keepachangelog.com/en/1.0.0/"
            target="_blank"
            rel="noopener noreferrer"
            className="link link-primary underline-offset-2"
          >
            Keep a Changelog
          </a>
          {" "}and{" "}
          <a
            href="https://semver.org/"
            target="_blank"
            rel="noopener noreferrer"
            className="link link-primary underline-offset-2"
          >
            Semantic Versioning
          </a>
          .
        </p>
      </header>

      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <article className="prose prose-base max-w-none dark:prose-invert">
            <ReactMarkdown>{changelogContent}</ReactMarkdown>
          </article>
        </div>
      </div>

      <footer className="mt-12 pt-8 border-t border-base-300">
        <p className="text-sm text-base-content/60 text-center">
          View on{" "}
          <a
            href="https://github.com/drugucopia/drugucopia.github.io/blob/dev/CHANGELOG.md"
            target="_blank"
            rel="noopener noreferrer"
            className="link link-primary underline-offset-2"
          >
            GitHub
          </a>
        </p>
      </footer>
    </main>
  );
}