import * as fs from "fs";
import * as MDAST from "mdast";
import * as path from "path";
import * as remark from "remark";
import * as find from "unist-util-find";

import getNoteLinks, { NoteLinkEntry } from "./getNoteLinks";
import getNoteTags from "./getNoteTags";
import processor from "./processor";
import getReflectBlock from "./getReflectBlock";

const missingTitleSentinel = { type: "missingTitle" } as const;

const headingFinder = processor().use(() => tree =>
  find(tree, { type: "heading", depth: 1 }) || missingTitleSentinel
);
interface Note {
  title: string;
  tags: string[];
  links: NoteLinkEntry[];
  noteContents: string;
  parseTree: MDAST.Root;
}

function try_(promise) {
  return promise
    .then(data => {
      return [null, data];
    })
    .catch(err => [err]);
}

async function readNote(notePath: string): Promise<Note> {
  const noteContents = await fs.promises.readFile(notePath, {
    encoding: "utf-8"
  });

  let parseTree = processor.parse(noteContents) as MDAST.Root;
  const headingNode = await headingFinder.run(parseTree);
  if (headingNode.type === "missingTitle") {
    throw new Error(`${notePath} has no title`);
  }
  const title = remark()
    .stringify({
      type: "root",
      children: (headingNode as MDAST.Heading).children
    })
    .trimEnd();

    const tags = getNoteTags(noteContents);
    if (tags.includes("#journal")) {
      const res = getReflectBlock(parseTree);
      if (res.isPresent) {
        parseTree = res.tree;
      }
    }
  return { 
    title, 
    links: getNoteLinks(parseTree), 
    parseTree, 
    tags: tags,
    noteContents };
}

export default async function readAllNotes(
  noteFolderPath: string
): Promise<{ [key: string]: Note }> {
  const noteDirectoryEntries = await fs.promises.readdir(noteFolderPath, {
    withFileTypes: true
  });
  const notePaths = noteDirectoryEntries
    .filter(entry => entry.isFile() && !entry.name.startsWith("."))
    .map(entry => path.join(noteFolderPath, entry.name));

  const noteEntries = await Promise.all(
    notePaths.map(async notePath => {
      let err, noteContents;
      [err, noteContents] = await try_(readNote(notePath));
      if (err) {
        console.log(`failed to read ${notePath}: ${err}`);
        return [notePath, null];
      }
      return [notePath, noteContents];
    })
  );
  return Object.fromEntries(noteEntries.filter(arr => arr[1] != null));
}
