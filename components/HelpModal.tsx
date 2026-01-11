import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLockBodyScroll } from '../hooks/useLockBodyScroll';

interface HelpModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type TabId = 'getting-started' | 'features' | 'shortcuts' | 'faq';

const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
    useLockBodyScroll(isOpen);
    const [activeTab, setActiveTab] = useState<TabId>('getting-started');

    const tabs: { id: TabId; label: string; icon: string }[] = [
        { id: 'getting-started', label: 'Getting Started', icon: 'rocket_launch' },
        { id: 'features', label: 'Features', icon: 'auto_awesome' },
        { id: 'shortcuts', label: 'Shortcuts', icon: 'keyboard' },
        { id: 'faq', label: 'FAQ', icon: 'help' },
    ];

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 liquid-glass-modal"
                onClick={onClose}
            />
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative liquid-glass-modal-content rounded-3xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col"
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-[#E8B4B8]/30">
                    <h2 className="text-2xl font-bold text-[#F5D7DA] flex items-center gap-3">
                        <span className="material-symbols-outlined text-[#DC143C]">help</span>
                        Help & Documentation
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 text-[#E8B4B8] hover:text-[#F5D7DA] rounded-full hover:bg-[rgba(192,48,80,0.25)] transition-colors"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-[#E8B4B8]/30 px-6">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id
                                ? 'border-[#C03050] text-[#C03050]'
                                : 'border-transparent text-[#E8B4B8] hover:text-[#F5D7DA]'
                                }`}
                        >
                            <span className="material-symbols-outlined text-lg">{tab.icon}</span>
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    <AnimatePresence mode="wait">
                        {activeTab === 'getting-started' && <GettingStartedTab key="getting-started" />}
                        {activeTab === 'features' && <FeaturesTab key="features" />}
                        {activeTab === 'shortcuts' && <ShortcutsTab key="shortcuts" />}
                        {activeTab === 'faq' && <FAQTab key="faq" />}
                    </AnimatePresence>
                </div>
            </motion.div>
        </div>
    );
};

const TabContent: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="space-y-6"
    >
        {children}
    </motion.div>
);

const Section: React.FC<{ title: string; icon: string; children: React.ReactNode }> = ({ title, icon, children }) => (
    <div className="liquid-glass rounded-xl p-5">
        <h3 className="text-lg font-semibold text-[#F5D7DA] mb-3 flex items-center gap-2">
            <span className="material-symbols-outlined text-[#C03050]">{icon}</span>
            {title}
        </h3>
        {children}
    </div>
);

const GettingStartedTab = () => (
    <TabContent>
        <div className="text-[#E8B4B8]/70">
            <div className="flex items-center gap-3 mb-4">
                <img src="./AcademiaTrack.png" alt="AcademiaTrack" className="w-12 h-12 object-contain" />
                <p className="text-lg">Welcome to <strong className="text-[#F5D7DA]">AcademiaTrack</strong>! This application helps you manage your graduate school applications in one place.</p>
            </div>
        </div>

        <Section title="Quick Start" icon="play_arrow">
            <ol className="list-decimal list-inside space-y-2 text-[#E8B4B8]/70">
                <li><strong>Add your first application</strong> - Click "Add New" in the header and fill in the university details.</li>
                <li><strong>Track progress</strong> - Update status, add deadlines, and track documents.</li>
                <li><strong>Connect with faculty</strong> - Add faculty contacts and track your outreach.</li>
                <li><strong>View analytics</strong> - See your application dashboard with charts and insights.</li>
                <li><strong>Switch views</strong> - Use List, Kanban, Calendar, or Budget views.</li>
            </ol>
        </Section>

        <Section title="Views" icon="view_quilt">
            <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="p-3 liquid-glass-card rounded-lg">
                    <span className="font-medium text-[#F5D7DA]">📋 List View</span>
                    <p className="text-[#E8B4B8]/70 mt-1">Card-based view with detailed info.</p>
                </div>
                <div className="p-3 liquid-glass-card rounded-lg">
                    <span className="font-medium text-[#F5D7DA]">📊 Kanban View</span>
                    <p className="text-[#E8B4B8]/70 mt-1">Drag-and-drop status management.</p>
                </div>
                <div className="p-3 liquid-glass-card rounded-lg">
                    <span className="font-medium text-[#F5D7DA]">📅 Calendar View</span>
                    <p className="text-[#E8B4B8]/70 mt-1">See deadlines in calendar format.</p>
                </div>
                <div className="p-3 liquid-glass-card rounded-lg">
                    <span className="font-medium text-[#F5D7DA]">💰 Budget View</span>
                    <p className="text-[#E8B4B8]/70 mt-1">Track costs and financial offers.</p>
                </div>
            </div>
        </Section>
    </TabContent>
);

const FeaturesTab = () => (
    <TabContent>
        <div className="grid gap-4">
            <Section title="Application Management" icon="folder_open">
                <ul className="space-y-2 text-[#E8B4B8]/70">
                    <li>• Track unlimited applications with detailed information</li>
                    <li>• Document status tracking (CV, SOP, Transcripts, LORs)</li>
                    <li>• Custom status workflow from "Not Started" to "Attending"</li>
                    <li>• Pin important applications to keep them at the top</li>
                </ul>
            </Section>

            <Section title="Faculty Contacts" icon="people">
                <ul className="space-y-2 text-slate-600 dark:text-slate-300">
                    <li>• Track faculty members you've contacted</li>
                    <li>• Log correspondence and meeting notes</li>
                    <li>• Rate research fit on a 1-10 scale</li>
                    <li>• Schedule and prepare for interviews</li>
                </ul>
            </Section>

            <Section title="Financial Tracking" icon="payments">
                <ul className="space-y-2 text-slate-600 dark:text-slate-300">
                    <li>• Track application fees and test costs</li>
                    <li>• Record financial offers and stipends</li>
                    <li>• Compare accepted offers side-by-side</li>
                    <li>• Calculate cost-per-admission-chance ROI</li>
                </ul>
            </Section>

            <Section title="Data Management" icon="backup">
                <ul className="space-y-2 text-slate-600 dark:text-slate-300">
                    <li>• Automatic backups to keep your data safe</li>
                    <li>• Export to JSON or CSV format</li>
                    <li>• Import from previous exports</li>
                    <li>• Local storage - your data stays on your device</li>
                </ul>
            </Section>
        </div>
    </TabContent>
);

const ShortcutsTab = () => (
    <TabContent>
        <Section title="Keyboard Shortcuts" icon="keyboard">
            <div className="space-y-3">
                {[
                    { keys: ['Ctrl', 'N'], action: 'Add new application' },
                    { keys: ['Ctrl', '1'], action: 'Switch to List view' },
                    { keys: ['Ctrl', '2'], action: 'Switch to Kanban view' },
                    { keys: ['Ctrl', '3'], action: 'Switch to Calendar view' },
                    { keys: ['Ctrl', '4'], action: 'Switch to Budget view' },
                    { keys: ['Escape'], action: 'Close modal / Exit selection mode' },
                ].map(({ keys, action }) => (
                    <div key={action} className="flex items-center justify-between py-2 border-b border-[#E8B4B8]/30 last:border-0">
                        <span className="text-[#E8B4B8]/70">{action}</span>
                        <div className="flex gap-1">
                            {keys.map(key => (
                                <kbd
                                    key={key}
                                    className="px-2 py-1 text-sm font-mono liquid-glass text-[#F5D7DA] rounded"
                                >
                                    {key}
                                </kbd>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </Section>

        <Section title="Mouse Actions" icon="mouse">
            <div className="space-y-2 text-[#E8B4B8]/70">
                <p>• <strong>Click</strong> on a card to edit the application</p>
                <p>• <strong>Right-click</strong> on a card to enter selection mode</p>
                <p>• <strong>Hover</strong> over a card to see action buttons (edit, delete, pin)</p>
                <p>• <strong>Drag</strong> cards in Kanban view to change status</p>
            </div>
        </Section>
    </TabContent>
);

const FAQTab = () => (
    <TabContent>
        <div className="space-y-4">
            {[
                {
                    q: 'Where is my data stored?',
                    a: 'Your data is stored locally on your computer in the app\'s data directory. No data is sent to external servers.'
                },
                {
                    q: 'How do I backup my data?',
                    a: 'The app automatically creates backups. You can also export your data to JSON from the header menu for manual backup.'
                },
                {
                    q: 'Can I import data from a previous backup?',
                    a: 'Yes! Use the Import function in the header menu to import a JSON file. This will replace your current data.'
                },
                {
                    q: 'How do I pin an application?',
                    a: 'Hover over any application card and click the pin icon. Pinned applications always appear at the top of the list.'
                },
                {
                    q: 'What do the different statuses mean?',
                    a: 'Not Started → Pursuing → In Progress → Submitted → Interview → Accepted/Rejected/Waitlisted → Attending. Use "Skipping" for universities you\'ve decided not to apply to.'
                },
                {
                    q: 'How do I add financial offer details?',
                    a: 'Open an application and go to the "Financials" tab. Toggle "Received Offer" and fill in the details.'
                },
            ].map(({ q, a }) => (
                <div key={q} className="liquid-glass-card rounded-xl p-4">
                    <h4 className="font-medium text-[#F5D7DA] mb-2">{q}</h4>
                    <p className="text-[#E8B4B8]/70 text-sm">{a}</p>
                </div>
            ))}
        </div>
    </TabContent>
);

export default HelpModal;
