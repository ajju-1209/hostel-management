import expressAsyncHandler from "express-async-handler";
import Complaint from "../models/complaintModel.js";
import { ComplaintType,Status } from "../Constants/Constants.js";
import mongoose from "mongoose";
import generateOTP from "../utils/generateOTP.js";

//@desc Create a new complaint
//@route /api/complaints/create
//@access Protected
const createComplaint = expressAsyncHandler(async (req, res) => {
  const { complaintType } = req.body;
  const preparedData = {
    createdBy: req.user.email,
    complaintType: complaintType,
    issueType: req.body.issueType,
  };
  if (complaintType === ComplaintType.standard) {
    preparedData.descriptionStandard = req.body.descriptionStandard;
  } else if (complaintType === ComplaintType.custom) {
    preparedData.descriptionCustom = req.body.descriptionCustom;
  }
  const complaint = await Complaint.create(preparedData);
  if (complaint) {
    res.status(201).json({
      id: complaint._id,
      createdBy: complaint.createdBy,
      createdOn: complaint.createdOn,
      complaintType: complaint.complaintType,
      descriptionStandard: complaint.descriptionStandard,
      descriptionCustom: complaint.descriptionCustom,
      status: complaint.status,
    });
  } else {
    res.status(400);
    throw new Error("Invalid Data");
  }
});

//@desc Delete a complaint
//@route /api/complaints/delete/:id
//@access Protected
const deleteComplaint = expressAsyncHandler(async (req, res) => {
  const complaint = await Complaint.findById(req.params.id)
  if(complaint) {
    complaint.status = Status.deferred 
  }else {
    res.json(401)
    throw new Error("No Complaint Found!")
  }
  res.json({ message: "Complaint Deleted" });
});

//@desc Get complaints for resident filter by issue type and status
//@routes /api/complaints/getByIssue
//@access Protected
const getForResident = expressAsyncHandler(async (req, res) => {
  const query = {};
  if (Array.isArray(req.query.issueType)) {
    query.issueType = { $in: req.query.issueType };
  } else if (req.query.issueType) {
    query.issueType = { $in: req.query.issueType };
  }

  if (Array.isArray(req.query.status)) {
    query.status = { $in: req.query.status };
  } else if (req.query.status) {
    query.status = { $in: req.query.status };
  }
  try {
    const complaints = await Complaint.find(query);

    res.status(201).send(complaints);
  } catch (e) {
    console.log(e);
  }
});

//@desc get complaints for admin populated by every required information, filter by issue type and status
//@route /api/complaints/admin/get
//@acess ADMIN
const getForAdmin = expressAsyncHandler(async (req, res) => {
  const query = {};
  if (Array.isArray(req.query.issueType)) {
    query.issueType = { $in: req.query.issueType };
  } else if (req.query.issueType) {
    query.issueType = { $in: req.query.issueType };
  }

  if (Array.isArray(req.query.status)) {
    query.status = { $in: req.query.status };
  } else if (req.query.status) {
    query.status = { $in: req.query.status };
  }
  try {
    const q = "email firstName lastName phoneNumber address userRole";
    const complaints = await Complaint.find(query).populate([
      { path: "complaintCreatorInfo", select: q },
      { path: "assignedPersonInfo", select: q },
      { path: "standardComplaintDescriptionInfo", select:"description"}
    ]);
    const complaintsInfo = [];
    for (let complaint of complaints) {
      let info = {};
      info.id = complaint._id;
      info.createdBy = complaint.createdBy;
      info.complaintCreatorInfo = complaint.complaintCreatorInfo;
      info.createdOnDate = complaint.createdOnDate;
      info.complaintType = complaint.complaintType;
      info.issueType = complaint.issueType;
      info.assignedTo = complaint.assignedTo;
      info.assignedPersonInfo = complaint.assignedPersonInfo;
      info.assignedBy = complaint.assignedBy;
      info.assignedOnDate = complaint.assignedOnDate;
      info.status = complaint.status;
      info.descriptionStandard = complaint.descriptionStandard;
      info.descriptionCustom = complaint.descriptionCustom;
      info.otpAssigned = complaint.otpAssigned;
      info.standardComplaintDescriptionInfo = complaint.standardComplaintDescriptionInfo
      complaintsInfo.push(info);
    }
    res.status(201).send(complaintsInfo);
  } catch (e) {
    console.log(e);
  }
});

//@desc Update information in complaints regarding status
//@route /api/complaints/admin/update
//@access Admin
const updateAdmin = expressAsyncHandler(async (req, res) => {
  const complaint = await Complaint.findById(req.body.id);
  if (complaint) {
    if (req.body.status === Status.assigned) {
      complaint.status = req.body.status;
      complaint.assignedTo = req.body.assignedTo;
      complaint.assignedBy = req.user.email;
      complaint.assignedOnDate = new Date();
      complaint.otpAssigned = generateOTP();

      let updatedComplaint = await complaint.save();
      updatedComplaint = await Complaint.findById(
        updatedComplaint._id
      ).populate([
        {
          path: "assignedPersonInfo",
          select: "email firstName lastName phoneNumber address userRole",
        }
      ]);
      res.json({
        status: updatedComplaint.status,
        assignedPersonInfo: updatedComplaint.assignedPersonInfo,
        assignedBy: updatedComplaint.assignedBy,
      });
    } else if (req.body.status === Status.solved) {
      complaint.status = req.body.status;
      const updatedComplaint = await complaint.save();
      res.json({
        status: updatedComplaint.status,
      });
    }
  } else {
    res.status(401);
    throw new Error("Complaint not found");
  }
});

//@desc update description
//@route /api/complaints/resident/update
//@access Protected
const updateResident = expressAsyncHandler(async (req, res) => {
  const complaint = await  Complaint.findById(req.body.id)
  if(complaint) {
    complaint.issueType = req.body.issueType
    complaint.complaintType = req.body.complaintType
    if(req.body.complaintType === ComplaintType.custom){
      complaint.descriptionCustom = req.body.descriptionCustom
    }else if(req.body.complaintType === ComplaintType.standard){
      complaint.descriptionStandard = req.body.descriptionStandard
    }

    let updatedComplaint = await complaint.save()
    updatedComplaint = await Complaint.findById(
      updatedComplaint._id
    ).populate([
      {
        path: "standardComplaintDescriptionInfo", select:"description"
      }
    ]);
    res.json({
      issueType: updatedComplaint.issueType,
      complaintType: updatedComplaint.complaintType,
      descriptionCustom: updatedComplaint.descriptionCustom,
      descriptionStandard: updatedComplaint.descriptionStandard,
      standardComplaintDescriptionInfo: updatedComplaint.standardComplaintDescriptionInfo
    })
  }else {
    res.status(401)
    throw new Error("No Complaint foundd")
  }
});
export {
  createComplaint,
  deleteComplaint,
  getForResident,
  getForAdmin,
  updateAdmin,
  updateResident,
};
