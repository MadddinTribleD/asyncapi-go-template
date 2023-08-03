import { File } from '@asyncapi/generator-react-sdk';
import { firstLetterUpperCase } from '../helper/firstLetterUpperCase';

function createProperty(name, schema, property) {
  let type = property.type();
  let format = property.format();

  let returnType = 'interface{}'; 

  const isArray = type === 'array';
  const isRequired = schema.required().includes(name);

  if (isArray) {
    type = property.items().type();
    format = property.items().format();
  }

  if (type === 'string' && format === 'date-time') {
    returnType = 'time.Time';
  }

  if (type === 'string') {
    returnType = 'string';
  }

  if (type === 'integer') {
    returnType = 'int';
  }

  if (type === 'number') {
    returnType = 'float64';
  }

  if (type === 'boolean') {
    returnType = 'bool';
  }

  return `${firstLetterUpperCase(name)} ${isRequired ? '' : '*'}${isArray ? '[]' : ''}${returnType} \`json:"${name}${isRequired ? '' : ',omitempty'}"\``;
}

function createSchema(name, schema) {
  const schemaProperties = schema.properties();

  const properties = Object.entries(schemaProperties).map(([name, property]) => {
    return createProperty(name, schema, property);
  });

  return `

type ${name} struct {
${properties.map(p => `  ${p}`).join('\n')}
}
`;
}

export default function({ asyncapi ,params}) {
  const allSchemas = asyncapi.allSchemas();

  const nonAnnonymousSchemasKeys = [...allSchemas.keys()].filter(name => {
    return !name.startsWith('<anonymous-schema-');
  });

  console.log(nonAnnonymousSchemasKeys);

  return nonAnnonymousSchemasKeys.map(name => {
    const schema = allSchemas.get(name);
    console.log(schema);

    return (
      <File name={`schema_${name}.go`}>
        package { params.packageName }
        {createSchema(name, schema)}
      </File>
    );
  });
}