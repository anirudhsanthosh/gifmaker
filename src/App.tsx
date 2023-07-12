import { createFFmpeg, fetchFile } from "@ffmpeg/ffmpeg";
import { useEffect, useState } from "react";
import { Toaster, toast } from "react-hot-toast";

const ffmpeg = createFFmpeg({ log: true, progress: (e) => console.log({ e }) });

function App() {
    const [ready, setReady] = useState(false);
    const [video, setVideo] = useState<null | undefined | File>();
    const [gif, setGif] = useState<null | string>();

    const [progress, setProgress] = useState(0);

    const [config, setConfig] = useState({
        width: "480",
        fsp: "4",
        time: "10",
    });

    const load = async () => {
        await ffmpeg.load();

        setReady(true);
    };

    useEffect(() => {
        load();
    }, []);

    const convertToGif = async () => {
        if (!ffmpeg) return toast.error("ffmpeg not initialized yet");

        if (!video) return toast.error("No file has choosen yet");

        ffmpeg.FS("writeFile", "test.mp4", await fetchFile(video));

        ffmpeg.setProgress(({ ratio }) => setProgress(ratio * 100));

        await ffmpeg.run(
            "-t",
            `${config.time}`,
            "-y",
            "-i",
            "test.mp4",
            "-vf",
            `fps=${config.fsp},scale=${config.width}:-1:flags=lanczos,split[s0][s1];[s0]palettegen=stats_mode=diff[p];[s1][p]paletteuse`,
            "-r",
            "10",
            "-loop",
            "0",
            "out.gif"
        );

        const data = ffmpeg.FS("readFile", "out.gif");

        const url = URL.createObjectURL(new Blob([data.buffer], { type: "image/gif" }));

        setGif(url);
    };

    if (!ready) return <p> Loading...</p>;
    return (
        <>
            <h1>Video to GIF converter</h1>
            <div className="flex w-full">
                <div className="w-full p-4">
                    <div className="py-4">
                        {video && <video controls width="250" src={URL.createObjectURL(video)}></video>}
                    </div>

                    <input type="file" onChange={(e) => setVideo(e.target.files?.item(0))} />
                    <div className="py-4">
                        <div className="py-4">
                            <strong>Configuration</strong>
                        </div>
                        <div>
                            <label className="pr-4">Width</label>
                            <input
                                value={config.width}
                                onChange={(e) => setConfig((old) => ({ ...old, width: e.target.value }))}
                                className=" border border-blue-600"
                                type="number"
                            />
                        </div>
                        <div>
                            <label className="pr-4">Duration</label>
                            <input
                                value={config.time}
                                onChange={(e) => setConfig((old) => ({ ...old, time: e.target.value }))}
                                className=" border border-blue-600"
                                type="number"
                            />
                        </div>
                        <div>
                            <label className="pr-4">Fsp</label>
                            <input
                                value={config.fsp}
                                onChange={(e) => setConfig((old) => ({ ...old, fsp: e.target.value }))}
                                className=" border border-blue-600"
                                type="number"
                            />
                        </div>
                    </div>
                    <div className="p-4 text-center">
                        <button className="px-4  bg-blue-600 text-white py-3 rounded-md" onClick={convertToGif}>
                            Convert
                        </button>
                    </div>
                </div>
                <div className="w-full p-4">
                    <h3>Result</h3>
                    <p>Progress : {progress} %</p>

                    {gif && (
                        <div>
                            <div className="flex">
                                <a href={gif} target="_blank">
                                    <img src={gif} width="250" />
                                </a>
                            </div>
                            <div className="py-4">
                                <a
                                    download={`${video?.name}.gif`}
                                    href={gif}
                                    className="px-4  bg-blue-600 text-white py-3 rounded-md"
                                >
                                    download
                                </a>
                            </div>
                        </div>
                    )}
                </div>
                <Toaster />
            </div>
        </>
    );
}

export default App;
