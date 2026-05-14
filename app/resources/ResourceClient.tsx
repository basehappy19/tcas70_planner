'use client'

import { useState } from 'react'
import { addResource, deleteResource } from '../actions/resource'

interface Subject {
    id: number
    name: string
}

interface Resource {
    id: number
    title: string
    type: string
    url: string | null
    content: string | null
    subject: Subject
}

export default function ResourceClient({ subjects, resources }: { subjects: Subject[], resources: Resource[] }) {
    const [filterSubject, setFilterSubject] = useState<string>('all')
    const [filterType, setFilterType] = useState<string>('all')
    const [isModalOpen, setIsModalOpen] = useState(false)

    const filteredResources = resources.filter(res => {
        const matchSubject = filterSubject === 'all' || res.id.toString() === filterSubject
        const matchType = filterType === 'all' || res.type === filterType
        return matchSubject && matchType
    })

    const handleDelete = async (id: number) => {
        if (confirm('ยืนยันการลบข้อมูลนี้?')) {
            await deleteResource(id)
        }
    }

    return (
        <section className="space-y-6">
            {/* Toolbar: Search & Filter */}
            <div className="flex flex-wrap gap-4 items-center justify-between bg-[#111] p-4 rounded-2xl border border-white/5">
                <div className="flex gap-3 overflow-x-auto pb-2 md:pb-0">
                    <select
                        className="bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 ring-blue-500"
                        onChange={(e) => setFilterSubject(e.target.value)}
                    >
                        <option value="all">ทุกรายวิชา</option>
                        {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>

                    <select
                        className="bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 ring-blue-500"
                        onChange={(e) => setFilterType(e.target.value)}
                    >
                        <option value="all">ทุกประเภท</option>
                        <option value="VIDEO">🎬 วิดีโอ</option>
                        <option value="DOCUMENT">📄 เอกสาร</option>
                        <option value="LINK">🔗 ลิงก์ภายนอก</option>
                        <option value="NOTE">📝 โน้ตสรุป</option>
                    </select>
                </div>

                <button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-white text-black px-5 py-2 rounded-full font-bold text-sm hover:bg-neutral-200 transition-colors"
                >
                    + เพิ่มทรัพยากรใหม่
                </button>
            </div>

            {/* Resources Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredResources.map((res) => (
                    <div key={res.id} className="group bg-[#111] border border-white/5 p-5 rounded-2xl hover:border-blue-500/50 transition-all duration-300">
                        <div className="flex justify-between items-start mb-3">
                            <span className="text-[10px] uppercase tracking-widest bg-blue-500/10 text-blue-400 px-2 py-1 rounded-md font-bold">
                                {res.subject.name}
                            </span>
                            <button
                                onClick={() => handleDelete(res.id)}
                                className="text-neutral-600 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
                            </button>
                        </div>

                        <h3 className="text-lg font-semibold mb-2 line-clamp-1">{res.title}</h3>

                        {res.content && (
                            <p className="text-sm text-neutral-400 mb-4 line-clamp-2">{res.content}</p>
                        )}

                        <div className="flex items-center justify-between mt-auto pt-4 border-t border-white/5">
                            <div className="flex items-center gap-2">
                                {res.type === 'VIDEO' && <span className="text-xl">🎬</span>}
                                {res.type === 'DOCUMENT' && <span className="text-xl">📄</span>}
                                {res.type === 'LINK' && <span className="text-xl">🔗</span>}
                                {res.type === 'NOTE' && <span className="text-xl">📝</span>}
                                <span className="text-xs text-neutral-500">{res.type}</span>
                            </div>

                            {res.url && (
                                <a
                                    href={res.url}
                                    target="_blank"
                                    className="text-xs font-bold text-blue-400 hover:underline flex items-center gap-1"
                                >
                                    OPEN <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
                                </a>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[#111] border border-white/10 w-full max-w-md rounded-3xl p-8">
                        <h2 className="text-2xl font-bold mb-6">เพิ่มเข้าคลังแสง 🗂️</h2>
                        <form action={async (formData) => {
                            await addResource(formData)
                            setIsModalOpen(false)
                        }} className="space-y-4">
                            <div>
                                <label className="block text-xs text-neutral-500 mb-1 uppercase font-bold">รายวิชา</label>
                                <select name="subjectId" className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl p-3 focus:outline-none focus:ring-2 ring-blue-500">
                                    <option value="">-- เลือกรายวิชา --</option>
                                    {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs text-neutral-500 mb-1 uppercase font-bold">หัวข้อ/ชื่อไฟล์</label>
                                <input name="title" required className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl p-3" placeholder="เช่น สรุปฟิสิกส์นิวเคลียร์" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs text-neutral-500 mb-1 uppercase font-bold">ประเภท</label>
                                    <select name="type" className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl p-3">
                                        <option value="VIDEO">🎬 วิดีโอ</option>
                                        <option value="DOCUMENT">📄 เอกสาร</option>
                                        <option value="LINK">🔗 ลิงก์ภายนอก</option>
                                        <option value="NOTE">📝 โน๊ตสรุป</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs text-neutral-500 mb-1 uppercase font-bold">URL (ถ้ามี)</label>
                                    <input name="url" className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl p-3" placeholder="https://..." />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs text-neutral-500 mb-1 uppercase font-bold">รายละเอียด/เนื้อหา</label>
                                <textarea name="content" rows={3} className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl p-3" placeholder="จดโน้ตย่อตรงนี้..."></textarea>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-3 rounded-xl border border-white/10 hover:bg-white/5 transition-colors">ยกเลิก</button>
                                <button type="submit" className="flex-1 px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 font-bold transition-colors">บันทึก</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </section>
    )
}