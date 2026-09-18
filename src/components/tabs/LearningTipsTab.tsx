import React from 'react';
import { 
  Lightbulb, 
  Timer, 
  Sparkles, 
  Ear, 
  UserCheck, 
  Footprints, 
  CheckCircle2, 
} from 'lucide-react';

export const LearningTipsTab: React.FC = () => {
  const tips = [
    {
      number: '01',
      title: 'The 3-Second Rule',
      short: 'Pause before you speak',
      desc: "When asked a question, don't rush. Take a 3-second pause to breathe and collect your thoughts before answering. It instantly makes you look composed and confident.",
      icon: Timer,
      actionPoint: 'Count 1... 2... 3... in your head, smile, and then deliver your first point.',
    },
    {
      number: '02',
      title: 'Keep it Simple',
      short: 'Clarity over complexity',
      desc: 'Avoid unnecessary technical jargon. Practice breaking down your ideas so that anyone in the room can easily understand your point.',
      icon: Sparkles,
      actionPoint: 'If someone from another department cannot understand it, simplify the vocabulary.',
    },
    {
      number: '03',
      title: 'Listen First',
      short: 'Active listening is leadership',
      desc: 'In a group discussion, active listening is a major advantage. Pay close attention to others and build your arguments using their points to show true leadership.',
      icon: Ear,
      actionPoint: 'Acknowledge: "As discussed earlier, adding to that key idea..." to command respect in discussions.',
    },
    {
      number: '04',
      title: 'Strong Posture',
      short: 'Physical poise builds confidence',
      desc: 'Stand tall and maintain steady eye contact. Channel the active, focused energy you use while playing sports and bring that same strong presence to the room.',
      icon: UserCheck,
      actionPoint: 'Keep shoulders back, plant both feet shoulder-width apart, and make 3-second eye contact across the room.',
    },
    {
      number: '05',
      title: 'Start Small',
      short: 'Every conversation is practice',
      desc: "You don't have to jump straight to a big stage. Build your confidence by speaking up clearly in smaller, everyday discussions or when coordinating plans with your friends.",
      icon: Footprints,
      actionPoint: 'Ask one question in class today or summarize a meeting topic in front of 2 peers.',
    },
  ];

  return (
    <div className="space-y-8 animate-fadeIn text-slate-100">
      {/* Header Banner */}
      <div className="rounded-3xl bg-gradient-to-br from-[#06111F] via-[#06111F] to-[#06111F] text-white p-6 sm:p-10 border border-[#BFA373]/40 shadow-2xl relative overflow-hidden">
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#BFA373]/20 text-[#BFA373] text-xs font-semibold uppercase tracking-wider border border-[#BFA373]/40">
            <Lightbulb className="w-3.5 h-3.5" />
            <span>Practical Speaking Advice</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-bold font-cinzel text-white tracking-wide">
            Learning Tips (Simple &amp; Practical)
          </h2>
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            Everyday public speaking techniques you can practice immediately in your college classes and club meetings.
          </p>
        </div>
      </div>

      {/* Tips Cards */}
      <div className="space-y-5">
        {tips.map((tip, idx) => {
          const Icon = tip.icon;
          return (
            <div
              key={idx}
              className="bg-[#06111F] rounded-2xl border border-[#BFA373]/30 hover:border-[#BFA373] p-6 sm:p-8 shadow-xl hover:shadow-2xl transition-all space-y-4 relative overflow-hidden"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-2xl bg-[#06111F] border border-[#BFA373]/30 text-[#BFA373] shadow-md shrink-0">
                    <Icon className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2.5">
                      <span className="text-xs font-bold font-cinzel text-[#BFA373]">
                        TIP {tip.number}
                      </span>
                      <span className="text-slate-600">&bull;</span>
                      <span className="text-xs font-medium text-slate-400 font-sans">
                        {tip.short}
                      </span>
                    </div>
                    <h3 className="text-lg sm:text-xl font-bold font-cinzel text-white mt-1">
                      {tip.title}
                    </h3>
                  </div>
                </div>
              </div>

              {/* Main Description */}
              <p className="text-slate-200 text-sm sm:text-base leading-relaxed font-sans bg-[#06111F] p-4 rounded-xl border border-[#BFA373]/30">
                {tip.desc}
              </p>

              {/* Actionable takeaway */}
              <div className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-300 font-sans pt-1">
                <CheckCircle2 className="w-4 h-4 text-[#BFA373] shrink-0 mt-0.5" />
                <span>
                  <strong className="text-[#BFA373] font-semibold">Pro Practice:</strong> {tip.actionPoint}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
