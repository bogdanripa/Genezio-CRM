import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowLeftIcon } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Account, getAccountById, createAccount, updateAccount } from "@/polymet/data/accounts-data";

// Form validation schema
const accountFormSchema = z.object({
  name: z.string().min(2, {
    message: "Account name must be at least 2 characters.",
  }),
  website: z
    .string()
    .url({
      message: "Please enter a valid URL.",
    })
    .optional()
    .or(z.literal("")),
  description: z.string().optional(),
  industry: z.string().min(1, {
    message: "Please select an industry.",
  }),
  status: z.string().min(1, {
    message: "Please select a status.",
  }),
  metrics: z
    .object({
      contractValue: z.coerce
        .number()
        .min(0, {
          message: "Contract value must be a positive number.",
        })
        .optional(),
      probability: z.coerce
        .number()
        .min(0, {
          message: "Probability must be between 0 and 100.",
        })
        .max(100, {
          message: "Probability must be between 0 and 100.",
        })
        .optional(),
    })
    .optional(),
});

export default function AccountFormPage() {
  const { accountId } = useParams();
  const isEditing = !!accountId;
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitSuccess, setIsSubmitSuccess] = useState(false);

  // Initialize form with default values or existing account data
  const form = useForm<z.infer<typeof accountFormSchema>>({
    resolver: zodResolver(accountFormSchema),
    defaultValues: {
      name: "",
      website: "",
      description: "",
      industry: "",
      status: "lead",
      metrics: {
        contractValue: 0,
        probability: 0,
      },
    },
  });

  // Load account data if editing
  useEffect(() => {
    if (isEditing && accountId) {
      getAccountById(accountId).then((account:Account) => {
        if (account) {
          form.reset({
            name: account.name,
            website: account.website || "",
            description: account.description || "",
            industry: account.industry || "",
            status: account.status,
            metrics: {
              contractValue: account.metrics?.contractValue || 0,
              probability: account.metrics?.probability || 0,
            },
          });
        } else {
          toast({
            title: "Account not found",
            description: "The account you're trying to edit doesn't exist.",
            variant: "destructive",
          });
        }
      });
    }
  }, [accountId, isEditing, form]);

  // Handle form submission
  const onSubmit = async (values: z.infer<typeof accountFormSchema>) => {
    setIsLoading(true);

    try {
      // In a real app, this would be an API call
      // For demo purposes, we'll simulate a network request
      await new Promise((resolve) => setTimeout(resolve, 1000));

      if (isEditing && accountId) {
        // Update existing account
        const updatedAccount = {
          id: accountId,
          ...values
        };

        // In a real app, this would update the database
        console.log("Updated account:", updatedAccount);

        await updateAccount(updatedAccount);

        toast({
          title: "Account updated",
          description: "The account has been updated successfully.",
        });
      } else {
        // Create new account
        // In a real app, this would add to the database
        console.log("New account:", values);
        await createAccount(values);

        toast({
          title: "Account created",
          description: "The new account has been created successfully.",
        });
      }

      // Set success state to trigger redirect
      setIsSubmitSuccess(true);
    } catch (error) {
      console.error("Error saving account:", error);
      toast({
        title: "Error",
        description: "There was an error saving the account. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // If submission was successful, show success message with link to accounts
  if (isSubmitSuccess) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Success!</CardTitle>
            <CardDescription>
              {isEditing ? "Account updated" : "Account created"} successfully.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p>
              {isEditing
                ? "Your changes have been saved."
                : "The new account has been added to your list."}
            </p>
          </CardContent>
          <CardFooter>
            <Link to="/accounts">
              <Button>Go to Accounts</Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild className="h-8 w-8">
          <Link to="/accounts">
            <ArrowLeftIcon className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">
          {isEditing ? "Edit Account" : "Create New Account"}
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
          <CardDescription>
            Enter the details for{" "}
            {isEditing ? "updating this" : "creating a new"} account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Account Name*</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter account name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="website"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Website</FormLabel>
                      <FormControl>
                        <Input placeholder="https://example.com" {...field} />
                      </FormControl>
                      <FormDescription>
                        Include the full URL with https://
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Brief description of the account"
                        className="resize-none"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="industry"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Industry*</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select an industry" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Technology">Technology</SelectItem>
                          <SelectItem value="Finance">Finance</SelectItem>
                          <SelectItem value="Healthcare">Healthcare</SelectItem>
                          <SelectItem value="Manufacturing">
                            Manufacturing
                          </SelectItem>
                          <SelectItem value="Retail">Retail</SelectItem>
                          <SelectItem value="Education">Education</SelectItem>
                          <SelectItem value="Conglomerate">
                            Conglomerate
                          </SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status*</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="lead">Lead</SelectItem>
                          <SelectItem value="prospect">Prospect</SelectItem>
                          <SelectItem value="qualified">Qualified</SelectItem>
                          <SelectItem value="negotiation">
                            Negotiation
                          </SelectItem>
                          <SelectItem value="closed-won">Closed Won</SelectItem>
                          <SelectItem value="closed-lost">
                            Closed Lost
                          </SelectItem>
                          <SelectItem value="churned">Churned</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="metrics.contractValue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contract Value ($)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          placeholder="0"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="metrics.probability"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Probability (%)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          placeholder="0"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <CardFooter className="flex justify-end gap-2 px-0">
                <Button type="button" variant="outline" asChild>
                  <Link to="/accounts">Cancel</Link>
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading
                    ? "Saving..."
                    : isEditing
                      ? "Update Account"
                      : "Create Account"}
                </Button>
              </CardFooter>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
