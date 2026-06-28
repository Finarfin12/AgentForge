module.exports = {
  manifest: {
    name: 'hello-world',
    version: '1.0.0',
    description: 'Example plugin that logs events',
    author: 'AgentForge',
    hooks: ['onInit', 'onDestroy', 'onTask'],
  },
  onInit(api) {
    api.logger.info('Hello World plugin initialized!');
  },
  onDestroy() {
    console.log('Hello World plugin destroyed');
  },
  onTask(task) {
    console.log(`Plugin received task: ${task.id} - ${task.prompt.substring(0, 50)}`);
    return { intercepted: false };
  },
};
