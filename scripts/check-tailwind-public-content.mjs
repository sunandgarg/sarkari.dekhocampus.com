#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, extname, relative, resolve, sep } from "node:path";
import ts from "typescript";
import { publicContent } from "../tailwind.public-content.mjs";

const root = resolve(import.meta.dirname, "..");
const entry = resolve(root, "src/main.tsx");
const sourceExtensions = [".ts", ".tsx"];
const unresolvedDynamicImports = [];

function toContentPath(file) {
  return `./${relative(root, file).split(sep).join("/")}`;
}

function resolveSource(importer, specifier) {
  let candidate;
  if (specifier.startsWith("@/")) {
    candidate = resolve(root, "src", specifier.slice(2));
  } else if (specifier.startsWith(".")) {
    candidate = resolve(dirname(importer), specifier);
  } else {
    return null;
  }

  const candidates = [];
  if (sourceExtensions.some((extension) => candidate.endsWith(extension))) {
    candidates.push(candidate);
  } else if (!extname(candidate)) {
    for (const extension of sourceExtensions) candidates.push(`${candidate}${extension}`);
    for (const extension of sourceExtensions) candidates.push(resolve(candidate, `index${extension}`));
  }
  return candidates.find((path) => existsSync(path)) || null;
}

function importedSpecifiers(file) {
  const source = readFileSync(file, "utf8");
  const sourceFile = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  const specifiers = [];

  function visit(node) {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      specifiers.push(node.moduleSpecifier.text);
    } else if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
      const argument = node.arguments[0];
      if (node.arguments.length === 1 && argument && ts.isStringLiteralLike(argument)) {
        specifiers.push(argument.text);
      } else {
        const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
        unresolvedDynamicImports.push(`${toContentPath(file)}:${line + 1}`);
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return specifiers;
}

const reachable = new Set();
const pending = [entry];
while (pending.length) {
  const file = pending.pop();
  if (!file || reachable.has(file)) continue;
  reachable.add(file);
  for (const specifier of importedSpecifiers(file)) {
    const dependency = resolveSource(file, specifier);
    if (dependency && !reachable.has(dependency)) pending.push(dependency);
  }
}

const duplicates = publicContent.filter((path, index) => publicContent.indexOf(path) !== index);
const configuredSources = new Set(publicContent.filter((path) => sourceExtensions.some((extension) => path.endsWith(extension))));
const reachableSources = new Set([...reachable].map(toContentPath));
const missing = [...reachableSources].filter((path) => !configuredSources.has(path)).sort();
const stale = [...configuredSources].filter((path) => !reachableSources.has(path)).sort();
const absent = publicContent.filter((path) => !existsSync(resolve(root, path))).sort();

if (duplicates.length || missing.length || stale.length || absent.length || unresolvedDynamicImports.length) {
  console.error("Tailwind public content is out of sync with the src/main.tsx import graph.");
  if (missing.length) console.error(`Missing reachable sources:\n${missing.join("\n")}`);
  if (stale.length) console.error(`Unreachable configured sources:\n${stale.join("\n")}`);
  if (absent.length) console.error(`Configured paths not found:\n${absent.join("\n")}`);
  if (duplicates.length) console.error(`Duplicate configured paths:\n${[...new Set(duplicates)].join("\n")}`);
  if (unresolvedDynamicImports.length) console.error(`Dynamic imports need literal paths:\n${unresolvedDynamicImports.join("\n")}`);
  process.exit(1);
}

console.log(`Tailwind public content check passed: ${reachableSources.size} reachable source files are covered exactly.`);

if (process.argv.includes("--dist")) {
  const gradientContract = readFileSync(resolve(root, "src/lib/adGradients.ts"), "utf8");
  const gradientClasses = [...new Set(
    [...gradientContract.matchAll(/\b(?:from|to)-[a-z]+-\d{3}\b/g)].map(([className]) => className),
  )];
  const assetDirectory = resolve(root, "dist/assets");
  const css = readdirSync(assetDirectory)
    .filter((filename) => filename.endsWith(".css"))
    .map((filename) => readFileSync(resolve(assetDirectory, filename), "utf8"))
    .join("\n");
  const missingGradientClasses = gradientClasses.filter((className) => !css.includes(`.${className}`));
  if (!gradientClasses.length || missingGradientClasses.length) {
    console.error("Built CSS is missing one or more dynamic ad gradient classes.");
    if (missingGradientClasses.length) console.error(missingGradientClasses.join("\n"));
    process.exit(1);
  }
  console.log(`Tailwind built CSS check passed: ${gradientClasses.length} dynamic ad gradient classes are present.`);
}
