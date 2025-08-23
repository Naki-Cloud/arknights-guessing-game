"use client";

import AnswerBlock from "@/_components/answer-block";
import { useState, useMemo, useEffect, useRef } from "react";
import songs from "../../public/song-metadata/songs.json";
import albums from "../../public/song-metadata/albums.json";
import AudioPlayer from "react-h5-audio-player";
import "react-h5-audio-player/lib/styles.css";
import "../../custom-audio-player.css";


export default function GuessingPage({ setIsGameStarted, setRestartGame, isEnglishOnly }) {
    const [answerSelected, setAnswerSelected] = useState(false);
    const [correctAnswerData, setCorrectAnswerData] = useState(null);

    const [lyrics, setLyrics] = useState([]);
    const [currentLine, setCurrentLine] = useState(0);

    const lyricsContainerRef = useRef(null);


    const filteredSongs = useMemo(() => {
        if (isEnglishOnly) {
            return songs.filter((s) => !/[\u4E00-\u9FFF]/.test(s.name));
        }
        return songs;
    }, [isEnglishOnly]);

    // Pick a random correct answer
    const correctAnswer = useMemo(() => {
        return filteredSongs[Math.floor(Math.random() * filteredSongs.length)];
    }, [filteredSongs]);

    // Pick 3 wrong answers and shuffle all 4
    const shuffledAnswers = useMemo(() => {
        const wrongs = filteredSongs
            .filter((s) => s.cid !== correctAnswer.cid)
            .sort(() => 0.5 - Math.random())
            .slice(0, 3);
        return [correctAnswer, ...wrongs].sort(() => 0.5 - Math.random());
    }, [correctAnswer, filteredSongs]);

    const handleAnswerSelected = () => setAnswerSelected(true);

    const correctAlbumCover = albums.find((a) => a.cid === correctAnswer.albumCid).coverUrl;

    useEffect(() => {
        async function fetchAudio() {
            const response = await fetch("/api/fetch-audio?songCID=" + correctAnswer.cid);


            if (response.ok) {
                setCorrectAnswerData(await response.json());
            }
        }

        fetchAudio();
    }, [correctAnswer]);

    console.log(correctAlbumCover);

    const parseLRC = (lrcText) => {
    const lines = lrcText.split("\n");
    return lines
        .map((line) => {
            const match = line.match(/\[(\d+):(\d+\.\d+)\](.*)/);
            if (match) {
                const minutes = parseInt(match[1], 10);
                const seconds = parseFloat(match[2]);
                const time = minutes * 60 + seconds;
                const text = match[3].trim();
                return { time, text };
            }
            return null;
        })
        .filter(Boolean);

    };

    useEffect(() => {
    if (!correctAnswerData?.data?.lyricUrl) return;

    async function fetchLyrics() {
        try {
            const response = await fetch(
                "/api/fetch-album-art?albumLink=" + correctAnswerData.data.lyricUrl
            );

            if (!response.ok) throw new Error("Failed to fetch lyrics");

            const text = await response.text();
            setLyrics(parseLRC(text));
        } catch (err) {
            console.error(err);
            setLyrics([]);
        }
    }

    fetchLyrics();
    }, [correctAnswerData]);

    

    console.log(correctAnswer.lyricUrl);
    // Sync lyrics with audio
    useEffect(() => {
        const audioEl = document.querySelector("audio");
        if (!audioEl) return;

        const onTimeUpdate = () => {
            if (!lyrics.length) return;
            const current = audioEl.currentTime;
            let i = 0;
            for (; i < lyrics.length; i++) {
                if (current < lyrics[i].time) break;
            }
            setCurrentLine(i - 1 >= 0 ? i - 1 : 0);
            
        };

        audioEl.addEventListener("timeupdate", onTimeUpdate);
        return () => audioEl.removeEventListener("timeupdate", onTimeUpdate);
    }, [lyrics]);

    useEffect(() => {
    if (!lyricsContainerRef.current) return;
    const activeLine = lyricsContainerRef.current.querySelector(
        `[data-line="${currentLine}"]`
    );
    if (activeLine) {
        activeLine.scrollIntoView({
            behavior: "smooth",
            block: "center",
        });
    }
    }, [currentLine]);

    return (
        <div className="bg-blue-950 w-full h-full text-white p-5 flex flex-col items-center justify-center">
             
            {correctAlbumCover && correctAnswerData?.data?.sourceUrl && (
                <section className="w-full pb-5 flex items-center justify-center">
                    <img className="ml-5 w-2/5 rounded-md" src={`/api/fetch-album-art?albumLink=${correctAlbumCover}`} alt="RIP album cover :(" ></img>
                    {/* Lyrics Section */}
                    {lyrics.length > 0 ? (
                        <section
                            ref={lyricsContainerRef}
                            className="ml-5 mr-5 rounded-md mb-5 bg-gray-700/50 mt-6 w-full h-90 overflow-y-auto text-center space-y-2"
                        >
                            {lyrics.map((line, idx) => (
                                <p
                                    key={idx}
                                    data-line={idx}
                                    className={`transition-colors ${
                                        idx === currentLine
                                            ? "mt-4 mb-4 text-yellow-400 font-bold text-2xl"
                                            : "text-gray-400"
                                    }`}
                                >
                                    {line.text || "..."}
                                </p>
                            ))}
                        </section>
                    ) : (
                        <section className="ml-5 mr-5 rounded-md mb-5 bg-gray-700/50 mt-6 w-full h-full text-center text-gray-400 italic flex items-center justify-center">
                            No lyrics available
                        </section>
                    )}
                        </section>
                        
                )}
            

            <section className="w-full">
                {correctAnswerData?.data?.sourceUrl && (
                    <AudioPlayer
                        src={correctAnswerData.data.sourceUrl}
                        // src={null}
                        autoPlay
                        volume={0.2}
                        showJumpControls={false}
                        hasDefaultKeyBindings={false}
                    />
                )}
            </section>
            {correctAnswerData && (
                <section className="grid grid-cols-2 gap-4 w-full">
                    {shuffledAnswers.map((song) => (
                        <AnswerBlock
                            key={song.cid}
                            answer={song}
                            correctAnswer={correctAnswer}
                            answerSelected={answerSelected}
                            onAnswerSelected={handleAnswerSelected}
                        />
                    ))}
                </section>
            )}

            {/* Game over buttons, 1. retry, 2. bring back the pre-guessing page */}
            {answerSelected && (
                <section className="flex flex-col items-center">
                    <button className="bg-amber-600 hover:bg-amber-800 text-white font-bold py-2 px-12 rounded text-2xl mt-10 cursor-pointer"
                        onClick={setRestartGame}
                    >
                        Play Again
                    </button>

                    <button className="bg-sky-600 hover:bg-sky-800 text-white font-bold py-2 px-12 rounded text-2xl mt-10 cursor-pointer"
                        onClick={() => setIsGameStarted(false)}
                    >
                        Settings
                    </button>
                </section>
            )}
        </div>
    );
}
