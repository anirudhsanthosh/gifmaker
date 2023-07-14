import { createFFmpeg, fetchFile } from "@ffmpeg/ffmpeg";
import axios from "axios";
import { useEffect, useRef, useState } from "react";
import { Toaster, toast } from "react-hot-toast";

const ffmpeg = createFFmpeg({ log: true, progress: (e) => console.log({ e }) });

const password = "sarath";

function App() {
    const [ready, setReady] = useState(false);
    const [video, setVideo] = useState<null | undefined | File>();
    const [gif, setGif] = useState<null | string>();

    const [userPassword, setUserPassword] = useState(localStorage.getItem("password") ?? "");
    const [s3Password, setS3Password] = useState(localStorage.getItem("s3password") ?? "");

    const [blob, setBlob] = useState<Blob | undefined>();

    const [progress, setProgress] = useState(0);

    const [s3Url, setS3Url] = useState("");

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

    const handlePasswordChange = (password: string) => {
        localStorage.setItem("password", password);

        setUserPassword(password);
    };

    const handleS3PasswordChange = (password: string) => {
        localStorage.setItem("s3password", password);

        setS3Password(password);
    };

    const upload = async () => {
        if (!blob) return toast.error("No file found to upload");
        const formData = new FormData();

        let file = new File([blob], `${video?.name}.gif`);

        formData.append("file", file, `${video?.name}.gif`);

        try {
            const request = axios.post(`https://apiv1.app.gozen.io/upload/gif`, formData, {
                headers: {
                    "Content-Type": `multipart/form-data`,
                },
                params: {
                    password: s3Password,
                },
            });

            toast.promise(request, { error: "Sorry failed to upload", success: "uploaded", loading: "uploading" });

            const response = await request;

            const imageUrl = response?.data?.url;

            setS3Url(imageUrl);
        } catch (err) {
            console.log(err);
        }
    };

    const convertToGif = async () => {
        if (!ffmpeg) return toast.error("ffmpeg not initialized yet");

        if (!video) return toast.error("No file has choosen yet");

        const toastId = toast.loading("Converting");
        try {
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

            const blob = new Blob([data.buffer], { type: "image/gif" });

            setBlob(blob);

            const url = URL.createObjectURL(blob);

            setGif(url);

            toast.success("Converted", { id: toastId });
        } catch (err) {
            console.error(err);

            toast.error("Failed to convert please reload this page and retry", { id: toastId });
        }
    };

    function copy() {
        var copyText = document.getElementById("myInput");

        if (!copyText) return toast.error("Failed to copy");

        // Select the text field
        (copyText as HTMLInputElement).select();
        (copyText as HTMLInputElement).setSelectionRange(0, 99999); // For mobile devices

        // Copy the text inside the text field
        navigator.clipboard.writeText((copyText as HTMLInputElement).value);

        toast.success("Copied");
    }

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    function getImageUrl() {
        if (!textareaRef.current) return;

        const text = textareaRef.current.value;

        if (!text.length) return toast.error("please fill some text first.");

        const parser = new DOMParser();

        try {
            const dom = parser.parseFromString(text, "text/html");

            const link = dom.querySelector("img")?.src;

            if (!link) return toast.error("No link found please try again");

            var copyText = document.getElementById("img-link");

            (copyText as HTMLInputElement).value = link;

            if (!copyText) return toast.error("Failed to copy");

            // Select the text field
            (copyText as HTMLInputElement).select();
            (copyText as HTMLInputElement).setSelectionRange(0, 99999); // For mobile devices

            // Copy the text inside the text field
            navigator.clipboard.writeText((copyText as HTMLInputElement).value);

            toast.success("Copied");
        } catch (err) {
            return toast.error("Sorry unable to get link");
        }
    }

    if (userPassword !== password)
        return (
            <div className="flex items-center justify-center w-screen h-screen">
                <input
                    value={userPassword}
                    onChange={(e) => handlePasswordChange(e.target.value)}
                    placeholder="password"
                    className="p-4 border border-blue-600 rounded-md"
                />
            </div>
        );
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
                                className="border border-blue-600 "
                                type="number"
                            />
                        </div>
                        <div>
                            <label className="pr-4">Duration</label>
                            <input
                                value={config.time}
                                onChange={(e) => setConfig((old) => ({ ...old, time: e.target.value }))}
                                className="border border-blue-600 "
                                type="number"
                            />
                        </div>
                        <div>
                            <label className="pr-4">Fsp</label>
                            <input
                                value={config.fsp}
                                onChange={(e) => setConfig((old) => ({ ...old, fsp: e.target.value }))}
                                className="border border-blue-600 "
                                type="number"
                            />
                        </div>
                    </div>
                    <div className="p-4 text-center">
                        <button className="px-4 py-3 text-white bg-blue-600 rounded-md" onClick={convertToGif}>
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
                            <div className="flex gap-2 py-4">
                                <a
                                    download={`${video?.name}.gif`}
                                    href={gif}
                                    className="px-4 py-3 text-white bg-blue-600 rounded-md"
                                >
                                    download
                                </a>
                                <button className="px-4 py-3 text-white bg-blue-600 rounded-md" onClick={upload}>
                                    Upload
                                </button>
                            </div>
                            <div>
                                <div>
                                    <input
                                        value={s3Password}
                                        onChange={(e) => handleS3PasswordChange(e.target.value)}
                                        placeholder="password for uploading"
                                        className="p-4 border border-blue-600 rounded-md"
                                        type="password"
                                    />
                                </div>
                                {s3Url && (
                                    <div className="flex gap-2 py-4">
                                        <input
                                            className="p-4 border border-blue-600 rounded-md"
                                            value={s3Url}
                                            id="myInput"
                                        />
                                        <button
                                            className="px-4 py-3 text-white bg-blue-600 rounded-md"
                                            onClick={() => copy()}
                                        >
                                            Copy
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
                <Toaster />
            </div>
            <div className="flex flex-col items-center justify-center gap-3 p-4">
                <p>Get image url from script</p>
                <textarea ref={textareaRef} className="w-full p-2 border border-blue-600 rounded-lg"></textarea>

                <button className="px-4 py-3 text-white bg-blue-600 rounded-md" onClick={getImageUrl}>
                    {" "}
                    get code
                </button>
            </div>
            <input type="text" className="w-px h-px" id="img-link" />
        </>
    );
}

export default App;
