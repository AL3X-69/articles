import * as fs from "fs";
import {marked} from "marked";
import {parse} from "yaml";
import {render} from "mustache";
import * as path from "path";
import prettify from "html-prettify";
import markedKatex from "marked-katex-extension";
import {globSync} from "glob";

const files = fs.readdirSync("content", {
    recursive: true,
    encoding: "utf-8",
});

marked.use(markedKatex({
    throwOnError: false,
}));

const template = fs.readFileSync("src/template.mustache", {encoding: "utf-8"});
const reactionTemplate = fs.readFileSync("src/reaction.mustache", {encoding: "utf-8"});

const parseKVMap = (s: string) => {
    const re = /(\w+)="([^"]*)"/g;
    const r: {[index: string]: string} = {};

    let match;
    while ((match = re.exec(s)) !== null) {
        const [, key, value] = match;
        r[key] = value;
    }

    return r;
}

const processList = (s: undefined | string | string[]) => {
    if (typeof s !== "string") return s;
    const parts = s.split(",");
    for (let i = 0; i < parts.length; i++) parts[i] = parts[i].trim();
    return parts;
}

for (let file of files.filter(v => v.endsWith(".md"))) {
    const content = fs.readFileSync(path.join("content/", file), {encoding: "utf-8"});
    const tags = parse(fs.readFileSync(path.join("content/", file + ".yml"), {encoding: "utf-8"}));

    tags.content = marked.parse(content) as string;

    if (tags["chemistry-tags"]) {
        // Reaction tag
        const re = /<reaction .+\/>/g;
        let r;
        while ((r = re.exec(tags.content)) !== null) {
            const tag = r[0].substring(10, r[0].length - 2).replaceAll("  ", " ");
            let map: {[index: string]: string | string[] | undefined} = parseKVMap(tag);

            map.consumes = processList(map.consumes);
            map.produces = processList(map.produces);

            map.arrow = `reaction_${map.reversible ? "rev" : "irrev"}_${map.consumes ? "c" : ""}${map.consumes ? "p" : ""}.svg`
                .replace("_.svg", ".svg");

            // TODO: smiles

            tags.content = tags.content.substring(0, re.lastIndex - r[0].length)
                + render(reactionTemplate, map)
                + tags.content.substring(re.lastIndex);
        }
    }

    if (tags.files) {
        for (let f of tags.files) {
            let curr = path.dirname(file);
            let dir = path.join("content/", curr);
            let out = "dist/";

            if (f.startsWith("resource:")) {
                dir = "resources/";
                f = f.replace("resource:", "");
                out = "dist/";
            }

            for (let r of globSync(path.join(dir, f))) {
                fs.mkdirSync(path.join(out, path.dirname(r.replace("content/", ""))), {recursive: true});
                fs.copyFileSync(r, path.join(out, r.replace("content/", "")));
            }
        }
    }


    const renderedHTML = render(template, tags);

    let dir = path.parse(path.join("dist/", file)).dir;
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, {recursive: true});

    // @ts-ignore (mandatory, see https://github.com/Dmc0125/html-prettify/pull/17#issuecomment-1880490297)
    fs.writeFileSync(path.join("dist/", file).replace(".md", ".html"), prettify(renderedHTML, {count: 4}));
    console.log("rendered "+file);
}

// Copy files
const cp = (f: string) => fs.copyFileSync(path.join("src/", f), path.join("dist/", f));
cp("article.css")
