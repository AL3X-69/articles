import * as fs from "fs";
import {marked} from "marked";
import {parse} from "yaml";
import {render} from "mustache";
import * as path from "path";

const files = fs.readdirSync("content", {
    recursive: true,
    encoding: "utf-8",
});

const template = fs.readFileSync("src/template.mustache", {encoding: "utf-8"});

// Courtesy of https://stackoverflow.com/a/60338028/13215032
function format(html: string) {
    const tab = '    ';
    let result = '';
    let indent= '';

    html.split(/>\s*</).forEach(function(element) {
        if (element.match( /^\/\w/ )) {
            indent = indent.substring(tab.length);
        }

        result += indent + '<' + element + '>\r\n';

        if (element.match( /^<?\w[^>]*[^\/]$/ ) && !element.startsWith("input")  ) {
            indent += tab;
        }
    });

    return result.substring(1, result.length-3);
}

for (let file of files.filter(v => v.endsWith(".md"))) {
    const content = fs.readFileSync(path.join("content/", file), {encoding: "utf-8"});
    const tags = parse(fs.readFileSync(path.join("content/", file + ".yml"), {encoding: "utf-8"}));
    tags.content = marked.parse(content) as string;
    const renderedHTML = render(template, tags);
    fs.writeFileSync(path.join("dist/", file).replace(".md", ".html"), format(renderedHTML));
    console.log("rendered "+file);
}
