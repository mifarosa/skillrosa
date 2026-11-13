#!/usr/bin/env python3
"""Refresh the local working cache of every source repository listed in sources.json.

The cache is only a working copy used by build.py to read frontmatter. Nothing from it
is published except the small index; SKILL.md bodies are fetched live from upstream.

Usage:
    python3 -I scripts/sync.py [--src DIR] [--jobs N]
"""
import argparse
import json
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def git(args, cwd=None, timeout=240):
    return subprocess.run(["git", *args], cwd=cwd, timeout=timeout, capture_output=True, text=True)


def sync_one(src_dir: Path, source: dict) -> str:
    """Clone or fast-forward one repo. Returns a one-line status."""
    repo, dest = source["repo"], src_dir / source["path"]
    url = f"https://github.com/{repo}.git"
    try:
        if (dest / ".git").is_dir():
            # Shallow fetch + hard reset survives force-pushes and history rewrites.
            before = git(["rev-parse", "HEAD"], cwd=dest).stdout.strip()
            r = git(["fetch", "--depth", "1", "-q", "origin"], cwd=dest)
            if r.returncode != 0:
                return f"WARN  {repo}: fetch failed, using stale copy ({r.stderr.strip()[:80]})"
            git(["reset", "--hard", "-q", "FETCH_HEAD"], cwd=dest)
            after = git(["rev-parse", "HEAD"], cwd=dest).stdout.strip()
            return f"{'UPDATED' if before != after else 'same   '} {repo}"
        r = git(["clone", "--depth", "1", "-q", url, str(dest)])
        if r.returncode != 0:
            return f"FAIL  {repo}: {r.stderr.strip()[:80]}"
        return f"CLONED {repo}"
    except subprocess.TimeoutExpired:
        return f"WARN  {repo}: timeout"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", default=str(ROOT.parent / "skillrosa-src"))
    ap.add_argument("--jobs", type=int, default=6)
    args = ap.parse_args()
    src_dir = Path(args.src)
    src_dir.mkdir(parents=True, exist_ok=True)

    sources = [s for s in json.loads((ROOT / "sources.json").read_text(encoding="utf-8")) if s.get("enabled", True)]
    with ThreadPoolExecutor(max_workers=args.jobs) as pool:
        for line in pool.map(lambda s: sync_one(src_dir, s), sources):
            print(line)
    return 0


if __name__ == "__main__":
    sys.exit(main())
