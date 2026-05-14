'use client'

import { useState } from 'react'
import { addResource, deleteResource } from '../actions/resource'
import Image from 'next/image'


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

function getYoutubeEmbed(url: string) {
    const regExp =
        /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/
    const match = url.match(regExp)

    return match && match[2].length === 11
        ? `https://www.youtube.com/embed/${match[2]}`
        : null
}

function getGoogleDrivePreview(url: string) {
    const match = url.match(/\/d\/(.*?)\//)

    if (match && match[1]) {
        return `https://drive.google.com/file/d/${match[1]}/preview`
    }

    return null
}

function ResourcePreview({ resource }: { resource: Resource }) {
    // VIDEO
    if (resource.type === 'VIDEO' && resource.url) {
        const embedUrl = getYoutubeEmbed(resource.url)

        if (embedUrl) {
            return (
                <div className="aspect-video rounded-xl overflow-hidden mb-4 border border-white/10">
                    <iframe
                        src={embedUrl}
                        className="w-full h-full"
                        allowFullScreen
                        loading="lazy"
                    />
                </div>
            )
        }
    }

    // DOCUMENT
    if (resource.type === 'DOCUMENT' && resource.url) {
        const drivePreview = getGoogleDrivePreview(resource.url)

        return (
            <div className="aspect-4/5 rounded-xl overflow-hidden mb-4 border border-white/10 bg-[#0a0a0a]">
                <iframe
                    src={drivePreview || resource.url}
                    className="w-full h-full"
                    loading="lazy"
                    allow="autoplay"
                />
            </div>
        )
    }

    // NOTE
    if (resource.type === 'NOTE') {
        const drivePreview = resource.url
            ? getGoogleDrivePreview(resource.url)
            : null

        if (drivePreview) {
            return (
                <div className="aspect-4/5 rounded-xl overflow-hidden mb-4 border border-yellow-500/20 bg-[#0a0a0a]">
                    <iframe
                        src={drivePreview}
                        className="w-full h-full"
                        loading="lazy"
                        allow="autoplay"
                    />
                </div>
            )
        }
    }

    // LINK
    if (resource.type === 'LINK' && resource.url) {
        let hostname = ''

        try {
            hostname = new URL(resource.url).hostname
        } catch { }

        const favicon = `https://www.google.com/s2/favicons?domain=${hostname}&sz=128`

        const isEmbeddable =
            resource.url.includes('figma.com') ||
            resource.url.includes('canva.com') ||
            resource.url.includes('docs.google.com')

        return (
            <div className="mb-4">
                {/* iframe preview */}
                {isEmbeddable ? (
                    <div className="aspect-video rounded-xl overflow-hidden border border-white/10 mb-3">
                        <iframe
                            src={resource.url}
                            className="w-full h-full"
                            loading="lazy"
                        />
                    </div>
                ) : (
                    <a
                        href={resource.url}
                        target="_blank"
                        className="block"
                    >
                        <div className="rounded-xl border border-white/10 overflow-hidden bg-[#1a1a1a]">
                            <div className="aspect-video bg-linear-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                                <Image
                                    src={favicon}
                                    alt={hostname}
                                    width={80}
                                    height={80}
                                    className="w-20 h-20 rounded-2xl"
                                />
                            </div>

                            <div className="p-4">
                                <p className="font-semibold line-clamp-1">
                                    {hostname}
                                </p>

                                <p className="text-sm text-neutral-400 truncate">
                                    {resource.url}
                                </p>
                            </div>
                        </div>
                    </a>
                )}
            </div>
        )
    }

    return null
}

export default function ResourceClient({
    subjects,
    resources,
}: {
    subjects: Subject[]
    resources: Resource[]
}) {
    const [filterSubject, setFilterSubject] = useState<string>('all')
    const [filterType, setFilterType] = useState<string>('all')
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [form, setForm] = useState({
        subjectId: '',
        title: '',
        type: '',
        url: '',
        content: '',
    })

    const [errors, setErrors] = useState({
        subjectId: false,
        title: false,
        type: false,
    })

    const validateForm = () => {
        const newErrors = {
            subjectId: !form.subjectId,
            title: !form.title.trim(),
            type: !form.type,
        }

        setErrors(newErrors)

        return !Object.values(newErrors).some(Boolean)
    }

    const isFormValid =
        form.subjectId &&
        form.title.trim() &&
        form.type

    const filteredResources = resources.filter((res) => {
        const matchSubject =
            filterSubject === 'all' ||
            res.subject.id.toString() === filterSubject

        const matchType =
            filterType === 'all' || res.type === filterType

        return matchSubject && matchType
    })

    const handleDelete = async (id: number) => {
        if (confirm('ยืนยันการลบข้อมูลนี้?')) {
            await deleteResource(id)
        }
    }

    return (
        <section className="space-y-6">
            <div className="flex flex-wrap gap-4 items-center justify-between bg-[#111] p-4 rounded-2xl border border-white/5">
                <div className="flex gap-3 overflow-x-auto pb-2 md:pb-0">
                    <select
                        className="cursor-pointer bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 ring-blue-500"
                        onChange={(e) =>
                            setFilterSubject(e.target.value)
                        }
                    >
                        <option value="all">ทุกรายวิชา</option>

                        {subjects.map((s) => (
                            <option key={s.id} value={s.id}>
                                {s.name}
                            </option>
                        ))}
                    </select>

                    <select
                        className="cursor-pointer bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 ring-blue-500"
                        onChange={(e) =>
                            setFilterType(e.target.value)
                        }
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
                    className="cursor-pointer bg-white text-black px-5 py-2 rounded-full font-bold text-sm hover:bg-neutral-200 transition-colors"
                >
                    + เพิ่มทรัพยากรใหม่
                </button>
            </div>

            {/* Resources Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredResources.map((res) => (
                    <div
                        key={res.id}
                        className="group bg-[#111] border border-white/5 p-5 rounded-2xl hover:border-blue-500/50 transition-all duration-300"
                    >
                        <ResourcePreview resource={res} />

                        <div className="flex justify-between items-start mb-3">
                            <span className="text-[10px] uppercase tracking-widest bg-blue-500/10 text-blue-400 px-2 py-1 rounded-md font-bold">
                                {res.subject.name}
                            </span>

                            <button
                                onClick={() =>
                                    handleDelete(res.id)
                                }
                                className="cursor-pointer text-neutral-600 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="18"
                                    height="18"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <path d="M3 6h18" />
                                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                                </svg>
                            </button>
                        </div>

                        <h3 className="text-lg font-semibold mb-2 line-clamp-1">
                            {res.title}
                        </h3>

                        {res.content && (
                            <p className="text-sm text-neutral-400 mb-4 line-clamp-2">
                                {res.content}
                            </p>
                        )}

                        <div className="flex items-center justify-between mt-auto pt-4 border-t border-white/5">
                            <div className="flex items-center gap-2">
                                {res.type === 'VIDEO' && (
                                    <span className="text-xl">🎬</span>
                                )}

                                {res.type === 'DOCUMENT' && (
                                    <span className="text-xl">📄</span>
                                )}

                                {res.type === 'LINK' && (
                                    <span className="text-xl">🔗</span>
                                )}

                                {res.type === 'NOTE' && (
                                    <span className="text-xl">📝</span>
                                )}

                                {res.type === 'VIDEO' ? (
                                    <span className="text-xl">
                                        วิดีโอ
                                    </span>
                                ) : res.type === 'DOCUMENT' ? (
                                    <span className="text-xl">
                                        เอกสาร
                                    </span>
                                ) : res.type === 'LINK' ? (
                                    <span className="text-xl">
                                        ลิงก์ภายนอก
                                    </span>
                                ) : res.type === 'NOTE' ? (
                                    <span className="text-xl">
                                        โน๊ตสรุป
                                    </span>
                                ) : (
                                    <span className="text-xl">
                                        {res.type}
                                    </span>
                                )}
                            </div>

                            {res.url && (
                                <a
                                    href={res.url}
                                    target="_blank"
                                    className="text-xs font-bold text-blue-400 hover:underline flex items-center gap-1"
                                >
                                    เปิด

                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        width="12"
                                        height="12"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="3"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    >
                                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                                        <polyline points="15 3 21 3 21 9" />
                                        <line
                                            x1="10"
                                            y1="14"
                                            x2="21"
                                            y2="3"
                                        />
                                    </svg>
                                </a>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[#111] border border-white/10 w-full max-w-md rounded-3xl p-8">
                        <h2 className="text-2xl font-bold mb-6">
                            เพิ่มเข้าคลังแสง 🗂️
                        </h2>

                        <form
                            action={async (formData) => {
                                if (!validateForm()) return

                                await addResource(formData)

                                setForm({
                                    subjectId: '',
                                    title: '',
                                    type: '',
                                    url: '',
                                    content: '',
                                })

                                setErrors({
                                    subjectId: false,
                                    title: false,
                                    type: false,
                                })

                                setIsModalOpen(false)
                            }}
                            className="space-y-4"
                        >
                            <div>
                                <label className="block text-xs text-neutral-500 mb-1 uppercase font-bold">
                                    รายวิชา
                                </label>

                                <select
                                    name="subjectId"
                                    value={form.subjectId}
                                    onChange={(e) => {
                                        setForm({
                                            ...form,
                                            subjectId: e.target.value,
                                        })

                                        if (e.target.value) {
                                            setErrors({
                                                ...errors,
                                                subjectId: false,
                                            })
                                        }
                                    }}
                                    className={`cursor-pointer w-full bg-[#1a1a1a] border rounded-xl p-3 focus:outline-none focus:ring-2 ring-blue-500 ${errors.subjectId
                                        ? 'border-red-500'
                                        : 'border-white/10'
                                        }`}
                                >
                                    <option value="">
                                        -- เลือกรายวิชา --
                                    </option>

                                    {subjects.map((s) => (
                                        <option
                                            key={s.id}
                                            value={s.id}
                                        >
                                            {s.name}
                                        </option>
                                    ))}
                                </select>
                                {errors.subjectId && (
                                    <p className="text-red-500 text-xs mt-1">
                                        กรุณาเลือกรายวิชา
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="block text-xs text-neutral-500 mb-1 uppercase font-bold">
                                    หัวข้อ/ชื่อไฟล์
                                </label>

                                <input
                                    name="title"
                                    value={form.title}
                                    onChange={(e) => {
                                        setForm({
                                            ...form,
                                            title: e.target.value,
                                        })

                                        if (e.target.value.trim()) {
                                            setErrors({
                                                ...errors,
                                                title: false,
                                            })
                                        }
                                    }}
                                    className={`w-full bg-[#1a1a1a] border rounded-xl p-3 ${errors.title
                                        ? 'border-red-500'
                                        : 'border-white/10'
                                        }`}
                                    placeholder="เช่น สรุปฟิสิกส์นิวเคลียร์"
                                />
                                {errors.title && (
                                    <p className="text-red-500 text-xs mt-1">
                                        กรุณากรอกหัวข้อ
                                    </p>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs text-neutral-500 mb-1 uppercase font-bold">
                                        ประเภท
                                    </label>

                                    <select
                                        name="type"
                                        value={form.type}
                                        onChange={(e) => {
                                            setForm({
                                                ...form,
                                                type: e.target.value,
                                            })

                                            if (e.target.value) {
                                                setErrors({
                                                    ...errors,
                                                    type: false,
                                                })
                                            }
                                        }}
                                        className={`cursor-pointer w-full bg-[#1a1a1a] border rounded-xl p-3 ${errors.type
                                            ? 'border-red-500'
                                            : 'border-white/10'
                                            }`}
                                    >
                                        <option value="">-- เลือกประเภท --</option>
                                        <option value="VIDEO">
                                            🎬 วิดีโอ
                                        </option>

                                        <option value="DOCUMENT">
                                            📄 เอกสาร
                                        </option>

                                        <option value="NOTE">
                                            📝 โน๊ตสรุป
                                        </option>

                                        <option value="LINK">
                                            🔗 ลิงก์ภายนอก
                                        </option>
                                    </select>
                                    {errors.type && (
                                        <p className="text-red-500 text-xs mt-1">
                                            กรุณาเลือกประเภท
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-xs text-neutral-500 mb-1 uppercase font-bold">
                                        URL (ถ้ามี)
                                    </label>

                                    <input
                                        name="url"
                                        className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl p-3"
                                        placeholder="https://..."
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs text-neutral-500 mb-1 uppercase font-bold">
                                    รายละเอียด/เนื้อหา
                                </label>

                                <textarea
                                    name="content"
                                    rows={3}
                                    className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl p-3"
                                    placeholder="จดโน้ตย่อตรงนี้..."
                                ></textarea>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() =>
                                        setIsModalOpen(false)
                                    }
                                    className="cursor-pointer flex-1 px-4 py-3 rounded-xl border border-white/10 hover:bg-white/5 transition-colors"
                                >
                                    ยกเลิก
                                </button>

                                <button
                                    type="submit"
                                    disabled={!isFormValid}
                                    className={`flex-1 px-4 py-3 rounded-xl font-bold transition-colors ${isFormValid
                                            ? 'cursor-pointer bg-blue-600 hover:bg-blue-500'
                                            : 'cursor-not-allowed bg-neutral-700 text-neutral-400'
                                        }`}
                                >
                                    บันทึก
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </section>
    )
}