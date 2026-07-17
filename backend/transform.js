module.exports = function(fileInfo, api, options) {
  const j = api.jscodeshift;
  const root = j(fileInfo.source);
  
  const targetSchema = options.schema || 'public';
  let modified = false;
  
  root.find(j.CallExpression, {
    callee: {
      type: 'MemberExpression',
      object: { name: 'sequelize' },
      property: { name: 'define' }
    }
  }).forEach(path => {
    const args = path.node.arguments;
    if (args.length === 2) {
      // No options object, create one
      args.push(j.objectExpression([
        j.property('init', j.identifier('schema'), j.literal(targetSchema))
      ]));
      modified = true;
    } else if (args.length === 3 && args[2].type === 'ObjectExpression') {
      const optionsObj = args[2];
      const hasSchema = optionsObj.properties.some(p => p.key && p.key.name === 'schema');
      if (!hasSchema) {
        optionsObj.properties.unshift(
          j.property('init', j.identifier('schema'), j.literal(targetSchema))
        );
        modified = true;
      }
    }
  });

  return modified ? root.toSource({ quote: 'single' }) : null;
};
