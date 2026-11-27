#!/usr/bin/env python3
"""Checks the shape of every story in a stories document.

    story_format.py <stories file> <story id regex>

A story is defined on one line, a list item, as a single sentence:

    - **US-B1.** As a <role>, when <one action or event>, <what the person gets>.

ending with "." or, when the exact output follows on the next lines, ":".
Under it come only that output and notes; whether they hold a further action
is for the reader to judge, not for this script. Prints each story that is not
in that shape, with its line and why, and exits 1 if there is any.
"""
import re
import sys


def strip_spans(text: str) -> str:
    """Drops what may hold sentences of its own: code, quotes, link targets."""
    text = re.sub(r"`[^`]*`", "`…`", text)
    text = re.sub(r"\]\([^)]*\)", "]", text)
    text = re.sub(r'"[^"]*"', '"…"', text)
    text = re.sub(r"“[^”]*”", "“…”", text)
    return text


def check(line: str, story_id: str) -> str | None:
    rest = re.match(r"\s*- \*\*" + re.escape(story_id) + r"\.\*\* (.*)$", line)
    if not rest:
        return "not a list item starting with **<id>.**"
    sentence = rest.group(1).rstrip()
    if not re.match(r"As (a|an|the) ", sentence):
        return 'does not start with "As a <role>"'
    plain = strip_spans(sentence)
    if ", when " not in plain:
        return 'has no ", when <action>," after the role'
    if not re.search(r"[.:][\"”`*_)]*$", sentence):
        return 'does not end with "." or ":"'
    head = plain.split(", when ", 1)[1]
    if ", " not in head:
        return 'has no ", <what I get>" after the action'
    if re.search(r"[.!?] +[A-Z*_]", plain.rstrip('"”`*_)')[:-1]):
        return "is more than one sentence"
    return None


def main() -> int:
    if len(sys.argv) != 3:
        print(__doc__.strip(), file=sys.stderr)
        return 2
    path, id_regex = sys.argv[1], sys.argv[2]
    definition = re.compile(r"\*\*(" + id_regex + r")\.\*\*")
    bad = 0
    count = 0
    with open(path, encoding="utf-8") as f:
        for n, line in enumerate(f, 1):
            found = definition.search(line)
            if not found or not re.match(r"\s*- \*\*", line):
                continue
            count += 1
            why = check(line, found.group(1))
            if why:
                bad += 1
                print(f"{path}:{n}: {found.group(1)} {why}")
    print(f"{count} stories, {bad} not in shape", file=sys.stderr)
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
