"use client";

import React, { useState } from "react";
import Link from "next/link";
import TimerIcon from "../app/assets/timer-icon.png";
import { useWriteContract, useAccount } from "wagmi";
import { config } from "@/config/wagmi";
import { waitForTransactionReceipt } from "wagmi/actions";
import Image from "next/image";
import {
  ProductFindRMainAddress,
  ProductFindRMainABI,
} from "@/constant/constant";
import stack from "@/stacks/stacks";

const LaunchForm = () => {
  const [formData, setFormData] = useState({
    productName: "",
    tagLine: "",
    productLink: "",
    twitterLink: "",
    description: "",
    isOpenSource: false,
    category: "",
    thumbNail: "",
    mediaFile: "",
    loomLink: "",
    workedWithTeam: false,
    teamMembersInput: "",
    pricingOption: "",
    offer: "",
    promoCode: "",
    expirationDate: "",
  });

  const [errors, setErrors] = useState({});
  const [step, setStep] = useState(1);

  const [thumbNailFile, setThumbNailFile] = useState(null);
  const [thumbNailCid, setThumbNailCid] = useState("");
  const [uploadingThumbNail, setUploadingThumbNail] = useState(false);
  const [mediaFile, setMediaFile] = useState(null);
  const [uploadingMediaFile, setUploadingMediaFile] = useState(false);
  const [mediaFileCid, setMediaFileCid] = useState("");
  const [launch, setLaunch] = useState(false);

  const [success, setSuccess] = useState(false);

  const { writeContractAsync } = useWriteContract();

  const account = useAccount();
  const connectionStatus = account.status;
  

  const isValidUrl = (urlString) => {
    try {
      new URL(urlString);
      return true;
    } catch (e) {
      return false;
    }
  };

  const validateField = (name, value) => {
    let error = "";

    if (typeof value === "string") {
      if (value.trim() === "") {
        error = `${name.replace(/([A-Z])/g, " $1").toLowerCase()} is required.`;
      } else if (name === "description" && value.split(/\s+/).length < 100) {
        error = "Description must be at least 100 words.";
      } else if (
        name === "twitterLink" &&
        !(
          value.startsWith("https://twitter.com/") ||
          value.startsWith("https://x.com/")
        )
      ) {
        error =
          "👀 X link must include 'https://twitter.com/' or 'https://x.com/'.";
      } else if (name === "productLink" && !isValidUrl(value)) {
        error = "Product link must be a valid URL.";
      } else if (
        name === "loomLink" &&
        !value.startsWith("https://www.loom.com/")
      ) {
        error = "Must be a valid loom video link";
      }
    }

    setErrors((prevErrors) => ({
      ...prevErrors,
      [name]: error,
    }));

    return error;
  };

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    const fieldValue = type === "checkbox" ? e.target.checked : value;

    setFormData((prevFormData) => ({
      ...prevFormData,
      [name]: fieldValue,
    }));

    validateField(name, fieldValue);
  };

  const handleRadioChange = (e) => {
    const value = e.target.value === "yes";
    setFormData((prevFormData) => ({
      ...prevFormData,
      isOpenSource: value,
    }));

    validateField("isOpenSource", value);
  };

  const uploadFile = async (fileToUpload, field) => {
    try {
      if (field === "thumbNail") {
        setUploadingThumbNail(true);
      } else {
        setUploadingMediaFile(true);
      }

      const data = new FormData();
      data.set("file", fileToUpload);

      const res = await fetch("/api/files", {
        method: "POST",
        body: data,
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.message || "Upload failed");
      }

      if (field === "thumbNail") {
        setThumbNailCid(resData.IpfsHash);
        setUploadingThumbNail(false);
      } else {
        setMediaFileCid(resData.IpfsHash);
        setUploadingMediaFile(false);
      }
      setFormData((prevFormData) => ({
        ...prevFormData,
        [field]: resData.IpfsHash,
      }));

      // Clear the error for this field on successful upload
      setErrors((prevErrors) => ({
        ...prevErrors,
        [field]: "",
      }));
    } catch (error) {
      console.error("Failed attempt: ", error);
      if (field === "thumbNail") {
        setUploadingThumbNail(false);
      } else {
        setUploadingMediaFile(false);
      }

      // Set the error message for the field
      setErrors((prevErrors) => ({
        ...prevErrors,
        [field]: "Failed to upload. Please retry.",
      }));
    }
  };

  const handleThumbNailChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setThumbNailFile(selectedFile);
      uploadFile(selectedFile, "thumbNail");
    } else {
      setErrors((prevErrors) => ({
        ...prevErrors,
        thumbNail: "Please select a valid file.",
      }));
    }
  };

  const handleMediaFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setMediaFile(selectedFile);
      uploadFile(selectedFile, "mediaFile");
    } else {
      setErrors((prevErrors) => ({
        ...prevErrors,
        mediaFile: "Please select a valid file.",
      }));
    }
  };

  const handleNext = (e) => {
    e.preventDefault();

    if (connectionStatus !== "connected") {
      setErrors((prev) => ({
        ...prev,
        connection: "Please connect your wallet to proceed",
      }));
      return;
    }

    // Validate all fields in part 1 before moving to part 2
    const part1Fields = [
      "productName",
      "tagLine",
      "productLink",
      "twitterLink",
      "description",
      "category",
    ];

    let valid = true;
    part1Fields.forEach((field) => {
      const error = validateField(field, formData[field] || "");
      if (error) valid = false;
    });

    if (valid) setStep(2);
    const part2Field = ["thumbNail", "mediaFile", "loomLink"];

    let valid2 = true;
    part2Field.forEach((field) => {
      const error = validateField(field, formData[field] || "");
      if (error) valid2 = false;
    });
    if (valid2) setStep(3);
    const part3Field = ["teamMembersInput"];
    let valid3 = true;
    part3Field.forEach((field) => {
      const error = validateField(field, formData[field] || "");
      if (error) valid3 = false;
    });
    if (valid3) setStep(4);
  };

  const handleSubmitLaunch = async (e) => {
    e.preventDefault();
    setLaunch(true);

    // Additional validation before submission
    const requiredFields = [
      "productName",
      "tagLine",
      "productLink",
      "twitterLink",
      "description",
      "category",
      "thumbNail",
      "mediaFile",
      "loomLink",
      "teamMembersInput",
      "pricingOption",
      "offer",
      "promoCode",
      "expirationDate",
    ];

    let isValid = true;
    requiredFields.forEach((field) => {
      const error = validateField(field, formData[field]);
      if (error) isValid = false;
    });

    if (!isValid) {
      alert("Please fill out all required fields correctly.");
      return;
    }

    const param = {
      productName: formData.productName,
      tagLine: formData.tagLine,
      productLink: formData.productLink,
      twitterLink: formData.twitterLink,
      description: formData.description,
      isOpenSource: formData.isOpenSource,
      category: formData.category,
      thumbNail: formData.thumbNail,
      mediaFile: formData.mediaFile,
      loomLink: formData.loomLink,
      workedWithTeam: formData.workedWithTeam,
      teamMembersInput: formData.teamMembersInput,
      pricingOption: formData.pricingOption,
      offer: formData.offer,
      promoCode: formData.promoCode,
      expirationDate: formData.expirationDate,
      betaTestingLink: "",
    };

    try {
      const tx = await writeContractAsync({
        abi: ProductFindRMainABI,
        address: ProductFindRMainAddress,
        functionName: "registerProduct",
        args: [account.address, param],
      });

      const transactionReceipt = await waitForTransactionReceipt(config, {
        hash: tx,
      });

      if (transactionReceipt.status === "success") {
        const addPoints = await stack.track("product_launch", {
          points: 10,
          account: account.address,
          uniqueId: account.address,
        });
        console.log("Add Points: ", addPoints.success === "true");
        setSuccess(true);
        setLaunch(false);
      } else {
        alert("Failed to list product. Please try again.");
        setLaunch(false);
      }
    } catch (error) {
      console.error("Failed Tx", error);
      alert("Failed to list product. Please try again.");
      setLaunch(false);
    }
  };

  return (
    <div className="bg-[#2828280D] container mx-auto py-2 px-4 sm:px-6 lg:px-8 p-8 rounded-2xl">
      <h2 className="text-[#9B30FF] text-3xl font-bold mb-6 text-start py-6">
        Launch a product🚀{" "}
      </h2>
      <form
        onSubmit={step < 4 ? handleNext : handleSubmitLaunch}
        className="space-y-4 p-4"
      >
        {step === 1 && (
          <>
            <h3 className="text-[#282828] text-2xl mb-6 text-start py-6">
              Main Information{" "}
            </h3>{" "}
            <div>
              <label
                htmlFor="productName"
                className="block text-md font-bold text-gray-700 mb-4 sm:text-xs md:text-base"
              >
                Name of the product{" "}
                <span className="text-[#9B30FF] pl-2"> * </span>{" "}
              </label>{" "}
              <input
                type="text"
                id="productName"
                name="productName"
                value={formData.productName}
                onChange={handleChange}
                required
                className="bg-transparent mt-1 block w-full border border-[#282828] rounded-2xl pl-4 h-14 sm:text-xs md:text-base"
                placeholder="Type the name of the product here"
              />{" "}
              {errors.productName && (
                <p className="text-red-500 text-xs md:text-sm">
                  {" "}
                  {errors.productName}{" "}
                </p>
              )}{" "}
            </div>{" "}
            <br />
            <div>
              <label
                htmlFor="tagLine"
                className="block text-md font-bold text-gray-700 mb-4 sm:text-xs md:text-base"
              >
                Tagline <span className="text-[#9B30FF] pl-2"> * </span>{" "}
              </label>{" "}
              <input
                type="text"
                id="tagLine"
                name="tagLine"
                value={formData.tagLine}
                onChange={handleChange}
                required
                className="bg-transparent mt-1 block w-full border border-[#282828] rounded-2xl pl-4 h-14 sm:text-xs md:text-base"
                placeholder="Insert your tagline for the product here"
              />{" "}
              {errors.tagLine && (
                <p className="text-red-500 text-xs md:text-sm">
                  {" "}
                  {errors.tagLine}{" "}
                </p>
              )}{" "}
            </div>{" "}
            <br />
            <div>
              <label
                htmlFor="productLink"
                className="block text-md font-bold text-gray-700 mb-4 sm:text-xs md:text-base"
              >
                Links🔗 <span className="text-[#9B30FF] pl-2"> * </span>{" "}
              </label>{" "}
              <input
                type="text"
                id="productLink"
                name="productLink"
                value={formData.productLink}
                onChange={handleChange}
                required
                className="bg-transparent mt-1 block w-full border border-[#282828] rounded-2xl pl-4 h-14 sm:text-xs md:text-base"
                placeholder="Insert link to project here"
              />{" "}
              {errors.productLink && (
                <p className="text-red-500 text-xs md:text-sm">
                  {" "}
                  {errors.productLink}{" "}
                </p>
              )}{" "}
            </div>{" "}
            <br />
            <div>
              <span className="block text-md font-bold text-gray-700 mb-4 sm:text-xs md:text-base">
                Is this an open source project ?{" "}
                <span className="text-[#9B30FF] pl-2"> * </span>{" "}
              </span>{" "}
              <div className="mt-2">
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    name="isOpenSource"
                    value="yes"
                    checked={formData.isOpenSource === true}
                    onChange={handleRadioChange}
                    className="form-radio h-4 w-4 text-gray-700 transition duration-150 ease-in-out"
                  />
                  <span className="ml-2 sm:text-xs md:text-base"> Yes </span>{" "}
                </label>{" "}
                <label className="inline-flex items-center ml-6">
                  <input
                    type="radio"
                    name="isOpenSource"
                    value="no"
                    checked={formData.isOpenSource === false}
                    onChange={handleRadioChange}
                    className="form-radio h-4 w-4 text-gray-700 transition duration-150 ease-in-out"
                  />
                  <span className="ml-2 sm:text-xs md:text-base"> No </span>{" "}
                </label>{" "}
              </div>{" "}
              {errors.isOpenSource && (
                <p className="text-red-500 text-xs md:text-sm">
                  {" "}
                  {errors.isOpenSource}{" "}
                </p>
              )}{" "}
            </div>{" "}
            <br />
            <div>
              <label
                htmlFor="twitterLink"
                className="block text-md font-bold text-gray-700 mb-4 sm:text-xs md:text-base"
              >
                Twitter(X) Link🔗{" "}
                <span className="text-[#9B30FF] pl-2"> * </span>{" "}
              </label>{" "}
              <input
                type="url"
                id="twitterLink"
                name="twitterLink"
                value={formData.twitterLink}
                onChange={handleChange}
                required
                className="bg-transparent mt-1 block w-full border border-[#282828] rounded-2xl pl-4 h-14 sm:text-xs md:text-base"
                placeholder="Insert twitter (X) profile link here"
              />{" "}
              {errors.twitterLink && (
                <p className="text-red-500 text-xs md:text-sm">
                  {" "}
                  {errors.twitterLink}{" "}
                </p>
              )}{" "}
            </div>{" "}
            <br />
            <div>
              <label
                htmlFor="description"
                className="block text-md font-bold text-gray-700 mb-4 sm:text-xs md:text-base"
              >
                Description📝 <span className="text-[#9B30FF] pl-2"> * </span>{" "}
              </label>{" "}
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                required
                rows={8}
                className="bg-transparent block w-full border border-[#282828] rounded-2xl pt-2 pl-4 sm:text-xs md:text-base resize-none"
                placeholder="Enter product description"
              />
              <span className="font-semibold flex justify-end mt-2 sm:text-xs md:text-base">
                Minimum of 100 words{" "}
              </span>{" "}
              {errors.description && (
                <p className="text-red-500 text-xs md:text-sm">
                  {" "}
                  {errors.description}{" "}
                </p>
              )}{" "}
            </div>{" "}
            <br />
            <div>
              <label
                htmlFor="category"
                className="block text-md font-bold text-gray-700 mb-4 sm:text-xs md:text-base"
              >
                Categories(select up to 3 categories){" "}
                <span className="text-[#9B30FF] pl-2"> * </span>{" "}
              </label>{" "}
              <input
                type="text"
                id="category"
                name="category"
                value={formData.category}
                onChange={handleChange}
                required
                className="bg-transparent mt-1 block w-full border border-[#282828] rounded-2xl pl-4 h-14 sm:text-xs md:text-base"
                placeholder="What best describes your product? - seperate with a comma , "
              />{" "}
              {errors.category && (
                <p className="text-red-500 text-xs md:text-sm">
                  {" "}
                  {errors.category}{" "}
                </p>
              )}{" "}
            </div>{" "}
            {errors.connection && (
              <p className="text-red-500 text-xs md:text-sm flex justify-end">
                {errors.connection}
              </p>
            )}
            <div className="text-right">
              <button
                type="submit"
                className="inline-flex items-center px-4 py-2 border border-transparent text-xs md:text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Next{" "}
              </button>{" "}
            </div>{" "}
          </>
        )}{" "}
        {step === 2 && (
          <>
            <h3 className="text-[#282828] text-2xl mb-6 text-start py-6">
              Images and media{" "}
            </h3>{" "}
            <div>
              <label
                htmlFor="thumbNail"
                className="block text-md font-bold text-gray-700 mb-4 sm:text-xs md:text-base"
              >
                Thumbnail🖼️ <span className="text-[#9B30FF] pl-2"> * </span>{" "}
              </label>{" "}
              <input
                type="file"
                id="thumbNail"
                name="thumbNail"
                onChange={handleThumbNailChange}
                required
                className="bg-transparent mt-1 block w-full border border-[#282828] rounded-2xl pl-4 py-2 h-14 sm:text-xs md:text-base"
              />{" "}
              {errors.thumbNail && (
                <p className="text-red-500 text-xs md:text-sm">
                  {" "}
                  {errors.thumbNail.toString()}{" "}
                </p>
              )}{" "}
              {uploadingThumbNail && <p> Uploading... </p>}{" "}
              {thumbNailCid && (
                <div>
                  <p> Upload complete. </p>{" "}
                  <Image
                    src={`${process.env.NEXT_PUBLIC_GATEWAY_URL}/ipfs/${thumbNailCid}`}
                    alt="uploaded image"
                    width={50}
                    height={50}
                  />{" "}
                </div>
              )}{" "}
            </div>
            <div>
              <label
                htmlFor="mediaFile"
                className="block text-md font-bold text-gray-700 mb-4 sm:text-xs md:text-base"
              >
                Media File📁{" "}
              </label>{" "}
              <input
                type="file"
                id="mediaFile"
                name="mediaFile"
                onChange={handleMediaFileChange}
                className="bg-transparent mt-1 block w-full border border-[#282828] rounded-2xl pl-4 py-2 h-14 sm:text-xs md:text-base"
              />{" "}
              {errors.mediaFile && (
                <p className="text-red-500 text-xs md:text-sm">
                  {" "}
                  {errors.mediaFile.toString()}{" "}
                </p>
              )}{" "}
              {uploadingMediaFile && <p> Uploading... </p>}{" "}
              {mediaFileCid && (
                <div>
                  <p> Upload complete. </p>{" "}
                  <Image
                    src={`${process.env.NEXT_PUBLIC_GATEWAY_URL}/ipfs/${mediaFileCid}`}
                    alt="uploaded image"
                    width={50}
                    height={50}
                  />{" "}
                </div>
              )}{" "}
            </div>{" "}
            <div>
              <label
                htmlFor="loomLink"
                className="block text-md font-bold text-gray-700 mb-4 sm:text-xs md:text-base"
              >
                Loom Video Link🔗{" "}
                <span className="text-[#9B30FF] pl-2"> * </span>{" "}
              </label>{" "}
              <input
                type="url"
                id="loomLink"
                name="loomLink"
                value={formData.loomLink}
                onChange={handleChange}
                required
                className="bg-transparent mt-1 block w-full border border-[#282828] rounded-2xl pl-4 h-14 sm:text-xs md:text-base"
                placeholder="Insert Loom video link here"
              />{" "}
              {errors.loomLink && (
                <p className="text-red-500 text-xs md:text-sm">
                  {" "}
                  {errors.loomLink}{" "}
                </p>
              )}{" "}
            </div>{" "}
            <div className="text-right">
              {thumbNailCid && mediaFileCid ? (
                <button
                  type="submit"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-xs md:text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  disabled={!(thumbNailCid && mediaFileCid)} // Disable button until both files are uploaded
                >
                  Next
                </button>
              ) : null}
            </div>
          </>
        )}{" "}
        {step === 3 && (
          <>
            <h3 className="text-[#282828] text-2xl mb-6 text-start py-6">
              Builders / team
            </h3>
            <div>
              <label className="block text-md font-bold text-gray-700 mb-4 sm:text-xs md:text-base">
                We would like to know if you worked on this alone or with a team
              </label>
              <div className="flex flex-col">
                <label className="mb-2">
                  <input
                    type="radio"
                    id="workedAlone"
                    name="workedWithTeam"
                    value="false"
                    checked={formData.workedWithTeam === false}
                    onChange={() =>
                      setFormData({
                        ...formData,
                        workedWithTeam: false,
                      })
                    }
                    className="form-radio h-4 w-4 text-gray-700 transition duration-150 ease-in-out mr-2"
                    required
                  />
                  Yes, i worked on building the product alone
                </label>
                <label className="mb-2">
                  <input
                    type="radio"
                    id="workedWithTeam"
                    name="workedWithTeam"
                    value="true"
                    checked={formData.workedWithTeam === true}
                    onChange={() =>
                      setFormData({
                        ...formData,
                        workedWithTeam: true,
                      })
                    }
                    className="form-radio h-4 w-4 text-gray-700 transition duration-150 ease-in-out mr-2"
                    required
                  />
                  I built it with my team members
                </label>
              </div>
              {errors.workedWithTeam && <p> {errors.workedWithTeam} </p>}
            </div>
            <div>
              <label
                htmlFor="teamMembersInput"
                className="block text-md font-bold text-gray-700 mb-4 sm:text-xs md:text-base"
              >
                Who worked on this project👥
                <span className="text-[#9B30FF] pl-2"> * </span>
              </label>
              <input
                type="text"
                id="teamMembersInput"
                name="teamMembersInput"
                value={formData.teamMembersInput}
                onChange={handleChange}
                required
                className="bg-transparent mt-1 block w-full border border-[#282828] rounded-2xl pl-4 h-14 sm:text-xs md:text-base"
                placeholder="Kindly add anyone who worked on this product"
              />
              {errors.teamMembersInput && (
                <p className="text-red-500 text-xs md:text-sm">
                  {errors.teamMembersInput}{" "}
                </p>
              )}
            </div>

            <div className="text-right">
              <button
                type="submit"
                className="inline-flex items-center px-4 py-2 border border-transparent text-xs md:text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Next
              </button>
            </div>
          </>
        )}
        {step === 4 && (
          <>
            {success === true ? (
              <>
                <div class="text-center">
                  <h2 class="text-[#9B30FF] text-3xl font-bold mb-6">
                    Congratulations 🎉
                  </h2>
                  <p class="text-lg">
                    You have successfully launched your product.
                  </p>
                  <Image
                    src={TimerIcon}
                    alt="success"
                    class="rounded-lg mt-6 mx-auto"
                    width={400}
                    height={300}
                  />
                  <p class="text-lg mt-6">
                    While you wait 24hrs for our onchain analysis, you can set
                    up a beta testing program for the product.
                  </p>
                  <div class="mt-6 flex justify-center space-x-4">
                    <Link
                      href="/"
                      className="bg-[#ECECEC] text-[#0B081C] px-4 py-4 rounded-2xl text-lg flex items-center space-x-2"
                    >
                      &lt;&lt; No, I just want to launch
                    </Link>
                    <Link
                      href="/beta-testing"
                      className="bg-white border-[1px] border-[#9B30FF] text-[#9B30FF] px-4 py-4 rounded-2xl text-lg flex items-center space-x-2"
                    >
                      Set up a beta testing ⚙️️
                    </Link>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="text-start mb-6">
                  <h3 className="text-[#282828] text-2xl mb-6 text-start py-6">
                    Pricing
                  </h3>
                  <div className="text-start mb-6">
                    <p className="text-md text-gray-600 mb-8">
                      Optional, but we will appreciate knowing:
                    </p>
                    <div className="space-y-4">
                      <div>
                        <label className="inline-flex items-center">
                          <input
                            type="radio"
                            className="form-radio text-indigo-600"
                            name="pricingOption"
                            value="free"
                            checked={formData.pricingOption === "free"}
                            onChange={handleChange}
                          />
                          <span className="ml-2 text-md font-bold text-gray-700 sm:text-xs md:text-base">
                            Free
                          </span>
                        </label>
                        <p className="text-sm text-gray-500 ml-6">
                          This product is free to use
                        </p>
                      </div>
                      <div>
                        <label className="inline-flex items-center">
                          <input
                            type="radio"
                            className="form-radio text-indigo-600"
                            name="pricingOption"
                            value="paid"
                            checked={formData.pricingOption === "paid"}
                            onChange={handleChange}
                          />
                          <span className="ml-2 text-md font-bold text-gray-700 sm:text-xs md:text-base">
                            Paid
                          </span>
                        </label>
                        <p className="text-sm text-gray-500 ml-6">
                          This product requires payment and there&apos;s no free
                          coupon
                        </p>
                      </div>
                      <div>
                        <label className="inline-flex items-center">
                          <input
                            type="radio"
                            className="form-radio text-indigo-600"
                            name="pricingOption"
                            value="paidWithTrial"
                            checked={formData.pricingOption === "paidWithTrial"}
                            onChange={handleChange}
                          />
                          <span className="ml-2 text-md font-bold text-gray-700 sm:text-xs md:text-base">
                            Paid (with a free trial or plan)
                          </span>
                        </label>
                        <p className="text-sm text-gray-500 ml-6">
                          This product requires payment with a free trial or
                          plan
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="text-start mb-6">
                  <p className="font-bold text-md text-gray-600 mb-8">
                    Promo code 🆓
                  </p>
                  <p className="text-md text-gray-600 mb-8">
                    If you’d like to offer a promo code for the ProductfindR
                    community, you can add it here.
                  </p>
                  <div className="flex flex-wrap space-x-4">
                    <div className="flex-1">
                      <label
                        className="block text-sm font-bold text-gray-700 mb-2"
                        htmlFor="offer"
                      >
                        What is the offer
                      </label>
                      <input
                        type="text"
                        id="offer"
                        name="offer"
                        placeholder="2 months free"
                        value={formData.offer}
                        onChange={handleChange}
                        className="bg-[#ECECEC] mt-1 block w-full border-[1px] border-[#282828] rounded-3xl py-2 px-3 text-gray-700"
                      />
                    </div>
                    <div className="flex-1">
                      <label
                        className="block text-sm font-bold text-gray-700 mb-2"
                        htmlFor="promoCode"
                      >
                        Promo code
                      </label>
                      <input
                        type="text"
                        id="promoCode"
                        name="promoCode"
                        placeholder="PFR300WWW"
                        value={formData.promoCode}
                        onChange={handleChange}
                        className="bg-[#ECECEC] mt-1 block w-full border-[1px] border-[#282828] rounded-3xl py-2 px-3 text-gray-700"
                      />
                    </div>
                    <div className="flex-1">
                      <label
                        className="block text-sm font-bold text-gray-700 mb-2"
                        htmlFor="expirationDate"
                      >
                        Expiration date
                      </label>
                      <input
                        type="date"
                        id="expirationDate"
                        name="expirationDate"
                        placeholder="None"
                        value={formData.expirationDate}
                        onChange={handleChange}
                        className="bg-[#ECECEC] mt-1 block w-full border-[1px] border-[#282828] rounded-3xl py-2 px-3 text-gray-700"
                      />
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <button
                    type="submit"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-xs md:text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    {launch ? "submitting..." : "Submit"}
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </form>
    </div>
  );
};

export default LaunchForm;
