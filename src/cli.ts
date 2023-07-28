import { Command } from 'commander';
import * as fs from 'fs';
import * as ohm from 'ohm-js';

const packageJson = require('../package.json');
const version: string = packageJson.version;

const grammar = ohm.grammar(`
  TML {
    Program = Statement*

    Statement = record symbol Block -- record
      | value type symbol --value

    StatementList = Statement | LiteralStatement | FieldStatement | FieldSetStatement

    FieldStatement = symbol symbol
    FieldSetStatement = set symbol
    LiteralStatement = type symbol

    Block = "{" StatementList* "}"

    set = "Set<" symbolList ">"

    record = "record" ~symbol
    value = "value" ~symbol
    symbol = (letter | "_")+
    symbolList = listOf<(symbol | set), ", ">
    type = int | string | bool
    eol = "\\n" | "\\r"

    int = "int"
    string = "string"
    bool = "bool"
  }
`);

class PrimitiveType {
  constructor(readonly name: string) {}
}

class DecoratedType {
  constructor(readonly name: string) {}
}

class TemplateType {
  types: (PrimitiveType | DecoratedType)[];
  constructor(..._types: (PrimitiveType | DecoratedType)[]) {
    this.types = _types;
  }
}

interface AstNode {
  toPhp(): string;
}

class Field implements AstNode {
  constructor(readonly type: DecoratedType, readonly name: string) {}

  toPhp() {
    return `public ${this.type.name} $${this.name};`;
  }
}

class FieldSet implements AstNode {
  constructor(readonly types: TemplateType, readonly name: string) {}

  toPhp() {
    const typeString = this.types.types.map(t => t.name).join(', ');

    return `
    /** @var Set<${typeString}> */
    public Set $${this.name};`;
  }
}

class Literal implements AstNode {
  constructor(readonly type: PrimitiveType, readonly name: string) {}

  toPhp() {
    return `public ${this.type.name} $${this.name};`;
  }
}

class Value implements AstNode {
  constructor(readonly type: PrimitiveType, readonly name: string) {}

  toPhp() {
    return `readonly class ${this.name}
{
    public ${this.type.name} $value;
}`;
  }
}

class Record implements AstNode {
  constructor(readonly name: string, readonly body: AstNode[]) {}

  toPhp() {
    return `readonly class ${this.name}
{
    ${this.body.map(b => b.toPhp()).join('\n    ')}
}`;
  }
}

const semantics = grammar.createSemantics();

semantics.addOperation<AstNode | AstNode[]>('toAST', {
  Program(exp) {
    return exp.children.map(e => e.toAST());
  },

  Block(_1, statementList, _2) {
    return statementList.children.map(e => e.toAST());
  },

  FieldStatement(type, name) {
    return new Field(new DecoratedType(type.sourceString), name.sourceString);
  },

  FieldSetStatement(set, name) {
    return new FieldSet(new TemplateType(...set.toAST()), name.sourceString);
  },

  LiteralStatement(type, name) {
    return new Literal(new PrimitiveType(type.sourceString), name.sourceString);
  },

  Statement_value(_, type, name) {
    return new Value(new PrimitiveType(type.sourceString), name.sourceString);
  },

  Statement_record(_, name, block) {
    return new Record(name.sourceString, block.toAST());
  },

  set(_1, symbolList, _2) {
    return symbolList.asIteration().children.map((c, index) => {
      switch (c.ctorName) {
        case 'type':
          return new PrimitiveType(c.sourceString);
        case 'symbol':
          return new DecoratedType(c.sourceString);
        default:
          return c.toAST();
      }
    });
  },

  _iter(...children) {
    return children.map(c => c.toAST());
  },

  _terminal(...children) {
    return [];
  },
});

const program = new Command();

program
  .version(version)
  .name('tml')
  .option('-d, --debug', 'enables verbose logging', false);

program.command('parse <file>').action((file: string) => {
  const fileContents: string = fs.readFileSync(file, 'utf8');

  const match = grammar.match(fileContents);

  if (match.failed()) {
    throw new Error(match.message);
  }

  const adapter = semantics(match);
  const ast: AstNode[] = adapter.toAST();

  console.log(ast.map(a => a.toPhp()));

  fs.writeFileSync(
    './out.php',
    `<?php\n\n${ast.map(a => a.toPhp()).join('\n\n')}`
  );
});

program.parse();
