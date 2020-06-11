import * as MDAST from "mdast";
import * as UNIST from "unist";
import * as is from "unist-util-is";

// Hacky type predicate here.
function isClosingMatterNode(node: UNIST.Node): node is UNIST.Node {
  return "value" in node && (node as MDAST.HTML).value.startsWith("<!--");
}

export default function getReflectBlock(
  tree: MDAST.Root
):
  | {
      isPresent: true;
      tree: MDAST.Root;
    }
  | {
      isPresent: false;
      tree: MDAST.Root
    } {
  const reflectNodeIndex = tree.children.findIndex(
    (node: UNIST.Node): node is MDAST.Heading =>
      is(node, {
        type: "heading",
        depth: 1
      }) && (is((node as MDAST.Heading).children[0], { value: "Reflect" }) || is((node as MDAST.Heading).children[0], { value: "Journal" }))
  );
  if (reflectNodeIndex === -1) {
    return {
      isPresent: false,
      tree
    };
  } else {
    const followingNode =
      tree.children
        .slice(reflectNodeIndex + 1)
        .find(node => is(node, [{ type: "heading" }, isClosingMatterNode])) ||
      null;
    return {
      isPresent: true,
      tree: {
          type: "root",
          children: tree.children.slice(reflectNodeIndex),
      }
    };
  }
}
