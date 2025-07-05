import React from 'react';
import { ChevronDown } from 'lucide-react';
import { useChatStore } from '../../store/chatStore';

const AVAILABLE_MODELS = [
  { id: 'gpt-4.1', name: 'GPT-4.1', description: 'Latest and most capable' },
  { id: 'gpt-4.1-mini', name: 'GPT-4.1 Mini', description: 'Faster and efficient' },
  { id: 'gpt-4.1-nano', name: 'GPT-4.1 Nano', description: 'Ultra-fast responses' },
  { id: 'gpt-4o', name: 'GPT-4o', description: 'Optimized performance' },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', description: 'Balanced speed and quality' },
  { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', description: 'Fast and cost-effective' },
];

export const ModelSelector: React.FC = () => {
  const { selectedModel, setSelectedModel } = useChatStore();

  const currentModel = AVAILABLE_MODELS.find(model => model.id === selectedModel) || AVAILABLE_MODELS[0];

  return (
    <div className="relative">
      <select
        value={selectedModel}
        onChange={(e) => setSelectedModel(e.target.value)}
        className="appearance-none bg-white border border-gray-300 rounded-lg px-3 py-1.5 pr-8 text-sm text-gray-700 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent min-w-[140px]"
      >
        {AVAILABLE_MODELS.map((model) => (
          <option key={model.id} value={model.id}>
            {model.name}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
    </div>
  );
};